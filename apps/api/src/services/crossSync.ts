/**
 * CrossSyncService
 *
 * Merges tracks across all playlists linked to a ShareList so every linked
 * user ends up with the full combined track list in their own playlist.
 *
 * Algorithm (same-provider only — cross-provider matching is a future story):
 *
 *   For each sharelist_link L:
 *     1. Fetch the current live track list for L's playlist.
 *     2. Collect ALL tracks from every OTHER linked playlist (same provider only).
 *     3. Compute the diff: tracks not yet in L's playlist AND not yet in
 *        sharelist_sync_log for this (link, track) pair.
 *     4. Call provider.addTracksToPlaylist() with the diff batch.
 *     5. Record each pushed (link, track) pair in sharelist_sync_log.
 *
 * The sync_log prevents the same track from being added more than once even
 * if the provider takes time to reflect the change or the playlist is re-synced
 * before the track appears live.
 */

import { supabaseAdmin } from '../lib/supabase'
import { getProvider } from '../streaming/registry'

// Side-effect: ensure providers are registered
import '../streaming/spotify'
import '../streaming/apple-music'

function log(level: string, message: string, ctx: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level, message, ...ctx }))
}

// ── DB row types ──────────────────────────────────────────────────────────────

interface SharelistLinkRow {
  id: string
  sharelist_id: string
  user_id: string
  provider: string
  provider_playlist_id: string
  provider_playlist_name: string
  is_primary: boolean
}

interface SyncLogRow {
  sharelist_link_id: string
  provider_track_id: string
}

// ── Public result type ────────────────────────────────────────────────────────

export interface CrossSyncLinkResult {
  linkId: string
  provider: string
  playlistName: string
  tracksAdded: number
  skipped: number
  error?: string
}

export interface CrossSyncResult {
  sharelistId: string
  links: CrossSyncLinkResult[]
  totalAdded: number
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function runCrossSync(
  _userId: string,
  sharelistId: string,
): Promise<CrossSyncResult> {
  // ── 1. Load all links for this ShareList ────────────────────────────────────
  const { data: links, error: linksErr } = await supabaseAdmin
    .from('sharelist_links')
    .select('*')
    .eq('sharelist_id', sharelistId)
    .order('is_primary', { ascending: false })

  if (linksErr) throw new Error(linksErr.message)
  if (!links || links.length === 0) {
    return { sharelistId, links: [], totalAdded: 0 }
  }

  const linkRows = links as SharelistLinkRow[]

  // ── 2. Fetch live tracks for every link (parallel) ──────────────────────────
  const tracksByLink = new Map<string, string[]>() // linkId → providerTrackIds

  const fetchResults = await Promise.allSettled(
    linkRows.map(async link => {
      const provider = getProvider(link.provider)
      const tracks = await provider.getPlaylistTracks(link.user_id, link.provider_playlist_id)
      return { linkId: link.id, trackIds: tracks.map(t => t.id) }
    }),
  )

  for (let i = 0; i < fetchResults.length; i++) {
    const result = fetchResults[i]
    const link = linkRows[i]
    if (result.status === 'fulfilled') {
      tracksByLink.set(result.value.linkId, result.value.trackIds)
    } else {
      log('warn', 'crossSync: failed to fetch tracks for link', {
        sharelistId,
        linkId: link.id,
        provider: link.provider,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      })
    }
  }

  // ── 3. Load the sync log for this ShareList ─────────────────────────────────
  const linkIds = linkRows.map(l => l.id)
  const { data: syncLogRows, error: logErr } = await supabaseAdmin
    .from('sharelist_sync_log')
    .select('sharelist_link_id, provider_track_id')
    .in('sharelist_link_id', linkIds)

  if (logErr) throw new Error(logErr.message)

  // Map: linkId → Set of already-synced trackIds
  const alreadySynced = new Map<string, Set<string>>()
  for (const row of (syncLogRows ?? []) as SyncLogRow[]) {
    const s = alreadySynced.get(row.sharelist_link_id) ?? new Set<string>()
    s.add(row.provider_track_id)
    alreadySynced.set(row.sharelist_link_id, s)
  }

  // ── 4. For each link, push the diff ─────────────────────────────────────────
  const linkResults: CrossSyncLinkResult[] = []
  let totalAdded = 0

  for (const link of linkRows) {
    const existingIds = new Set(tracksByLink.get(link.id) ?? [])
    const syncedIds = alreadySynced.get(link.id) ?? new Set<string>()

    // Collect tracks from all OTHER links on the same provider
    const candidateIds: string[] = []
    for (const other of linkRows) {
      if (other.id === link.id) continue
      if (other.provider !== link.provider) continue   // same-provider only

      const otherTracks = tracksByLink.get(other.id) ?? []
      for (const trackId of otherTracks) {
        if (!existingIds.has(trackId) && !syncedIds.has(trackId)) {
          candidateIds.push(trackId)
        }
      }
    }

    // Deduplicate (multiple other links may share the same track)
    const toAdd = [...new Set(candidateIds)]
    const skipped = candidateIds.length - toAdd.length

    if (toAdd.length === 0) {
      log('info', 'crossSync: no new tracks for link', {
        sharelistId,
        linkId: link.id,
        provider: link.provider,
        playlistName: link.provider_playlist_name,
      })
      linkResults.push({
        linkId: link.id,
        provider: link.provider,
        playlistName: link.provider_playlist_name,
        tracksAdded: 0,
        skipped,
      })
      continue
    }

    try {
      const provider = getProvider(link.provider)
      const addResult = await provider.addTracksToPlaylist(
        link.user_id,
        link.provider_playlist_id,
        toAdd,
      )

      // Record each successfully pushed track in the sync log
      const logInserts = toAdd.map(trackId => ({
        sharelist_link_id: link.id,
        provider_track_id: trackId,
      }))

      const { error: insertErr } = await supabaseAdmin
        .from('sharelist_sync_log')
        .upsert(logInserts, { onConflict: 'sharelist_link_id,provider_track_id' })

      if (insertErr) {
        log('warn', 'crossSync: failed to write sync log', {
          sharelistId,
          linkId: link.id,
          error: insertErr.message,
        })
      }

      log('info', 'crossSync: tracks added', {
        sharelistId,
        linkId: link.id,
        provider: link.provider,
        playlistName: link.provider_playlist_name,
        tracksAdded: addResult.added,
        skipped,
      })

      totalAdded += addResult.added
      linkResults.push({
        linkId: link.id,
        provider: link.provider,
        playlistName: link.provider_playlist_name,
        tracksAdded: addResult.added,
        skipped,
      })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      log('warn', 'crossSync: addTracksToPlaylist failed', {
        sharelistId,
        linkId: link.id,
        provider: link.provider,
        error: errMsg,
      })
      linkResults.push({
        linkId: link.id,
        provider: link.provider,
        playlistName: link.provider_playlist_name,
        tracksAdded: 0,
        skipped,
        error: errMsg,
      })
    }
  }

  return { sharelistId, links: linkResults, totalAdded }
}
