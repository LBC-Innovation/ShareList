/**
 * Applies a shuffled track order to every playlist linked to a ShareList.
 *
 * Each linked playlist keeps its own membership. Tracks that exist on that
 * playlist are rewritten in the relative order of `orderedTrackIds`.
 */

import { supabaseAdmin } from '../lib/supabase'
import { getProvider } from '../streaming/registry'

import '../streaming/spotify'
import '../streaming/apple-music'

function log(level: string, message: string, ctx: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level, message, ...ctx }))
}

interface SharelistLinkRow {
  id: string
  sharelist_id: string
  user_id: string
  provider: string
  provider_playlist_id: string
  provider_playlist_name: string
}

export interface ShuffleLinkResult {
  linkId: string
  provider: string
  playlistName: string
  written: number
  error?: string
}

export interface ShuffleResult {
  sharelistId: string
  links: ShuffleLinkResult[]
  totalWritten: number
}

export async function applyShuffledOrder(
  sharelistId: string,
  orderedTrackIds: string[],
): Promise<ShuffleResult> {
  const { data: links, error: linksErr } = await supabaseAdmin
    .from('sharelist_links')
    .select('*')
    .eq('sharelist_id', sharelistId)
    .order('is_primary', { ascending: false })

  if (linksErr) throw new Error(linksErr.message)
  if (!links || links.length === 0) {
    return { sharelistId, links: [], totalWritten: 0 }
  }

  const results: ShuffleLinkResult[] = []

  for (const raw of links as SharelistLinkRow[]) {
    const playlistName = raw.provider_playlist_name
    try {
      const provider = getProvider(raw.provider)
      const live = await provider.getPlaylistTracks(raw.user_id, raw.provider_playlist_id)
      const liveIds = new Set(live.map(track => track.id))
      const ordered: string[] = []
      const used = new Set<string>()

      for (const id of orderedTrackIds) {
        if (!liveIds.has(id) || used.has(id)) continue
        ordered.push(id)
        used.add(id)
      }
      for (const track of live) {
        if (used.has(track.id)) continue
        ordered.push(track.id)
        used.add(track.id)
      }

      const { written } = await provider.replacePlaylistTracks(
        raw.user_id,
        raw.provider_playlist_id,
        ordered,
      )

      log('info', 'shuffle: playlist rewritten', {
        sharelistId,
        linkId: raw.id,
        provider: raw.provider,
        written,
      })

      results.push({
        linkId: raw.id,
        provider: raw.provider,
        playlistName,
        written,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      log('warn', 'shuffle: failed to rewrite playlist', {
        sharelistId,
        linkId: raw.id,
        provider: raw.provider,
        error: message,
      })
      results.push({
        linkId: raw.id,
        provider: raw.provider,
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
