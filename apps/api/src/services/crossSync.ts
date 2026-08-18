/**
 * CrossSyncService
 *
 * Merges tracks across all playlists linked to a ShareList so every linked
 * user ends up with the full combined track list in their own playlist.
 *
 * Algorithm:
 *
 *   For each sharelist_link L:
 *     1. Fetch the current live track list for L's playlist.
 *     2. Collect candidates from every OTHER linked playlist:
 *        - same provider: native track IDs
 *        - other provider: dest native IDs from track_mappings when matched
 *     3. Diff: tracks not yet in L's playlist AND not yet in sharelist_sync_log.
 *     4. Call provider.addTracksToPlaylist() with the diff batch.
 *     5. Record each pushed (link, track) pair in sharelist_sync_log.
 *
 * The sync_log prevents the same track from being added more than once even
 * if the provider takes time to reflect the change or the playlist is re-synced
 * before the track appears live.
 */

import { supabaseAdmin } from '../lib/supabase'
import { getProvider } from '../streaming/registry'
import type { StreamingTrack } from '../streaming/types'
import { resolveDestTrackId, resolveMappingsForTracks } from './trackMatcher'

// Side-effect: ensure providers are registered
import '../streaming/spotify'
import '../streaming/apple-music'
import '../streaming/soundcloud'

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
  unmatched: number
  error?: string
}

export interface CrossSyncResult {
  sharelistId: string
  links: CrossSyncLinkResult[]
  totalAdded: number
  totalUnmatched: number
}

export interface PlaylistOrderLinkResult {
  linkId: string
  provider: string
  playlistName: string
  written: number
  error?: string
}

export interface PlaylistOrderResult {
  sharelistId: string
  links: PlaylistOrderLinkResult[]
  totalWritten: number
}

// ── Service ───────────────────────────────────────────────────────────────────

async function loadSharelistLinks(sharelistId: string): Promise<SharelistLinkRow[]> {
  const { data: links, error: linksErr } = await supabaseAdmin
    .from('sharelist_links')
    .select('*')
    .eq('sharelist_id', sharelistId)
    .order('is_primary', { ascending: false })

  if (linksErr) throw new Error(linksErr.message)
  return (links ?? []) as SharelistLinkRow[]
}

export async function runCrossSync(
  _userId: string,
  sharelistId: string,
): Promise<CrossSyncResult> {
  const linkRows = await loadSharelistLinks(sharelistId)
  if (linkRows.length === 0) {
    return { sharelistId, links: [], totalAdded: 0, totalUnmatched: 0 }
  }

  const tracksByLink = new Map<string, StreamingTrack[]>()

  const fetchResults = await Promise.allSettled(
    linkRows.map(async link => {
      const provider = getProvider(link.provider)
      const tracks = await provider.getPlaylistTracks(link.user_id, link.provider_playlist_id)
      return { linkId: link.id, tracks }
    }),
  )

  const tagged: Array<StreamingTrack & { provider?: string }> = []
  for (let i = 0; i < fetchResults.length; i++) {
    const result = fetchResults[i]
    const link = linkRows[i]
    if (result.status === 'fulfilled') {
      tracksByLink.set(result.value.linkId, result.value.tracks)
      tagged.push(...result.value.tracks.map(t => ({ ...t, provider: link.provider })))
    } else {
      log('warn', 'crossSync: failed to fetch tracks for link', {
        sharelistId,
        linkId: link.id,
        provider: link.provider,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      })
    }
  }

  const destLinks = linkRows.map(l => ({ provider: l.provider, userId: l.user_id }))
  const mappings = await resolveMappingsForTracks(tagged, destLinks)

  const linkIds = linkRows.map(l => l.id)
  const { data: syncLogRows, error: logErr } = await supabaseAdmin
    .from('sharelist_sync_log')
    .select('sharelist_link_id, provider_track_id')
    .in('sharelist_link_id', linkIds)

  if (logErr) throw new Error(logErr.message)

  const alreadySynced = new Map<string, Set<string>>()
  for (const row of (syncLogRows ?? []) as SyncLogRow[]) {
    const s = alreadySynced.get(row.sharelist_link_id) ?? new Set<string>()
    s.add(row.provider_track_id)
    alreadySynced.set(row.sharelist_link_id, s)
  }

  const linkResults: CrossSyncLinkResult[] = []
  let totalAdded = 0
  let totalUnmatched = 0

  for (const link of linkRows) {
    const existingIds = new Set((tracksByLink.get(link.id) ?? []).map(t => t.id))
    const syncedIds = alreadySynced.get(link.id) ?? new Set<string>()
    const candidateIds: string[] = []
    let unmatched = 0

    for (const other of linkRows) {
      if (other.id === link.id) continue
      const otherTracks = tracksByLink.get(other.id) ?? []

      if (other.provider === link.provider) {
        for (const track of otherTracks) {
          if (!existingIds.has(track.id) && !syncedIds.has(track.id)) {
            candidateIds.push(track.id)
          }
        }
        continue
      }

      for (const track of otherTracks) {
        const mapping = mappings.find(m =>
          m.sourceProvider === other.provider
          && m.sourceTrackId === track.id
          && m.destProvider === link.provider,
        )
        if (!mapping) {
          unmatched += 1
          continue
        }
        const destId = mapping.destTrackId
        if (!destId) {
          unmatched += 1
          continue
        }
        if (!existingIds.has(destId) && !syncedIds.has(destId)) {
          candidateIds.push(destId)
        }
      }
    }

    const toAdd = [...new Set(candidateIds)]
    const skipped = candidateIds.length - toAdd.length
    totalUnmatched += unmatched

    if (toAdd.length === 0) {
      log('info', 'crossSync: no new tracks for link', {
        sharelistId,
        linkId: link.id,
        provider: link.provider,
        playlistName: link.provider_playlist_name,
        unmatched,
      })
      linkResults.push({
        linkId: link.id,
        provider: link.provider,
        playlistName: link.provider_playlist_name,
        tracksAdded: 0,
        skipped,
        unmatched,
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
        unmatched,
      })

      totalAdded += addResult.added
      linkResults.push({
        linkId: link.id,
        provider: link.provider,
        playlistName: link.provider_playlist_name,
        tracksAdded: addResult.added,
        skipped,
        unmatched,
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
        unmatched,
        error: errMsg,
      })
    }
  }

  return { sharelistId, links: linkResults, totalAdded, totalUnmatched }
}

/**
 * Rewrites each linked playlist so its own tracks follow `orderedTrackIds`.
 * Playlist membership is preserved; only relative order changes.
 * Uses the same link loading and provider write surface as Sync Lists.
 */
export async function applyLinkedPlaylistOrder(
  sharelistId: string,
  orderedTrackIds: string[],
): Promise<PlaylistOrderResult> {
  const linkRows = await loadSharelistLinks(sharelistId)
  if (linkRows.length === 0) {
    return { sharelistId, links: [], totalWritten: 0 }
  }

  const results: PlaylistOrderLinkResult[] = []

  for (const link of linkRows) {
    const playlistName = link.provider_playlist_name
    try {
      const provider = getProvider(link.provider)
      const live = await provider.getPlaylistTracks(link.user_id, link.provider_playlist_id)
      const liveIds = new Set(live.map(track => track.id))
      const ordered: string[] = []
      const used = new Set<string>()

      for (const id of orderedTrackIds) {
        const destId = await resolveDestTrackId(id, link.provider, liveIds)
        if (!destId || used.has(destId)) continue
        ordered.push(destId)
        used.add(destId)
      }
      for (const track of live) {
        if (used.has(track.id)) continue
        ordered.push(track.id)
        used.add(track.id)
      }

      const { written } = await provider.replacePlaylistTracks(
        link.user_id,
        link.provider_playlist_id,
        ordered,
      )

      log('info', 'playlist order rewritten', {
        sharelistId,
        linkId: link.id,
        provider: link.provider,
        playlistName,
        written,
      })

      results.push({
        linkId: link.id,
        provider: link.provider,
        playlistName,
        written,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      log('warn', 'failed to rewrite playlist order', {
        sharelistId,
        linkId: link.id,
        provider: link.provider,
        error: message,
      })
      results.push({
        linkId: link.id,
        provider: link.provider,
        playlistName,
        written: 0,
        error: message,
      })
    }
  }

  return {
    sharelistId,
    links: results,
    totalWritten: results.reduce((sum, row) => sum + row.written, 0),
  }
}
