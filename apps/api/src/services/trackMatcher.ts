/**
 * Track matcher — caches cross-provider IDs and resolves missing mappings.
 *
 * Stores platform IDs and match status only (no audio or artwork).
 */

import { supabaseAdmin } from '../lib/supabase'
import { getProvider } from '../streaming/registry'
import type { StreamingTrack } from '../streaming/types'

const MAPPING_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type MappingStatus = 'matched' | 'unmatched' | 'ambiguous'

export interface TrackMapping {
  sourceProvider: string
  sourceTrackId: string
  destProvider: string
  destTrackId: string | null
  status: MappingStatus
  method: string | null
  checkedAt: string
}

export type AvailabilityStatus = 'present' | 'matched' | 'unmatched' | 'ambiguous' | 'unknown'

export interface ShareListDisplayTrack extends StreamingTrack {
  provider?: string
  platformIds?: Record<string, string>
  availability?: Array<{ provider: string; status: AvailabilityStatus }>
}

interface MappingRow {
  source_provider: string
  source_track_id: string
  dest_provider: string
  dest_track_id: string | null
  status: MappingStatus
  method: string | null
  checked_at: string
}

function log(level: string, message: string, ctx: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level, message, ...ctx }))
}

function isFresh(checkedAt: string): boolean {
  return Date.now() - new Date(checkedAt).getTime() < MAPPING_TTL_MS
}

export async function loadMappingsForTracks(
  tracks: Array<{ id: string; provider?: string }>,
  destProviders: string[],
): Promise<TrackMapping[]> {
  if (tracks.length === 0 || destProviders.length === 0) return []
  const sourceIds = [...new Set(tracks.map(t => t.id))]

  const { data, error } = await supabaseAdmin
    .from('track_mappings')
    .select('source_provider, source_track_id, dest_provider, dest_track_id, status, method, checked_at')
    .in('source_track_id', sourceIds)
    .in('dest_provider', destProviders)

  if (error) throw new Error(`loadMappingsForTracks failed: ${error.message}`)

  return ((data ?? []) as MappingRow[]).map(row => ({
    sourceProvider: row.source_provider,
    sourceTrackId: row.source_track_id,
    destProvider: row.dest_provider,
    destTrackId: row.dest_track_id,
    status: row.status,
    method: row.method,
    checkedAt: row.checked_at,
  }))
}

async function upsertMapping(row: {
  source_provider: string
  source_track_id: string
  dest_provider: string
  dest_track_id: string | null
  status: MappingStatus
  method: string | null
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from('track_mappings')
    .upsert({
      ...row,
      checked_at: new Date().toISOString(),
    }, { onConflict: 'source_provider,source_track_id,dest_provider' })

  if (error) {
    log('warn', 'track mapping upsert failed', { error: error.message, ...row })
  }
}

export async function resolveMappingsForTracks(
  tracks: Array<StreamingTrack & { provider?: string }>,
  destLinks: Array<{ provider: string; userId: string }>,
): Promise<TrackMapping[]> {
  const destProviders = [...new Set(destLinks.map(l => l.provider))]
  const existing = await loadMappingsForTracks(tracks, destProviders)
  const existingKey = new Map(
    existing.map(m => [`${m.sourceProvider}::${m.sourceTrackId}::${m.destProvider}`, m]),
  )

  const destUser = new Map<string, string>()
  for (const link of destLinks) {
    if (!destUser.has(link.provider)) destUser.set(link.provider, link.userId)
  }

  for (const track of tracks) {
    const sourceProvider = track.provider
    if (!sourceProvider) continue
    for (const destProvider of destProviders) {
      if (destProvider === sourceProvider) continue
      const key = `${sourceProvider}::${track.id}::${destProvider}`
      const cached = existingKey.get(key)
      if (cached && isFresh(cached.checkedAt)) continue

      const destUserId = destUser.get(destProvider)
      if (!destUserId) continue
      const dest = getProvider(destProvider)
      if (!dest.searchTrack) {
        await upsertMapping({
          source_provider: sourceProvider,
          source_track_id: track.id,
          dest_provider: destProvider,
          dest_track_id: null,
          status: 'unmatched',
          method: null,
        })
        continue
      }

      try {
        const result = await dest.searchTrack(destUserId, {
          isrc: track.isrc,
          title: track.title,
          artist: track.artist,
          durationMs: track.durationMs,
        })
        if (result.status === 'matched') {
          await upsertMapping({
            source_provider: sourceProvider,
            source_track_id: track.id,
            dest_provider: destProvider,
            dest_track_id: result.track.id,
            status: 'matched',
            method: result.method,
          })
          await upsertMapping({
            source_provider: destProvider,
            source_track_id: result.track.id,
            dest_provider: sourceProvider,
            dest_track_id: track.id,
            status: 'matched',
            method: result.method,
          })
        } else {
          await upsertMapping({
            source_provider: sourceProvider,
            source_track_id: track.id,
            dest_provider: destProvider,
            dest_track_id: null,
            status: result.status,
            method: null,
          })
        }
      } catch (err) {
        log('warn', 'track search failed', {
          sourceProvider,
          destProvider,
          trackId: track.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  return loadMappingsForTracks(tracks, destProviders)
}

export function collapseTracksWithMappings(
  tracks: Array<StreamingTrack & { provider?: string }>,
  mappings: TrackMapping[],
  linkedProviders: string[],
): ShareListDisplayTrack[] {
  const parent = new Map<string, string>()
  const keyOf = (provider: string, id: string) => `${provider}::${id}`

  function find(key: string): string {
    const p = parent.get(key)
    if (!p || p === key) {
      parent.set(key, key)
      return key
    }
    const root = find(p)
    parent.set(key, root)
    return root
  }

  function union(a: string, b: string): void {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(rb, ra)
  }

  for (const track of tracks) {
    if (!track.provider) continue
    find(keyOf(track.provider, track.id))
  }
  for (const mapping of mappings) {
    if (mapping.status !== 'matched' || !mapping.destTrackId) continue
    union(keyOf(mapping.sourceProvider, mapping.sourceTrackId), keyOf(mapping.destProvider, mapping.destTrackId))
  }

  const groups = new Map<string, Array<StreamingTrack & { provider?: string }>>()
  for (const track of tracks) {
    const provider = track.provider ?? '_'
    const root = find(keyOf(provider, track.id))
    const list = groups.get(root) ?? []
    list.push(track)
    groups.set(root, list)
  }

  const display: ShareListDisplayTrack[] = []
  for (const members of groups.values()) {
    const primary = members[0]
    if (!primary) continue
    const platformIds: Record<string, string> = {}
    for (const member of members) {
      if (member.provider) platformIds[member.provider] = member.id
    }
    for (const mapping of mappings) {
      if (mapping.status !== 'matched' || !mapping.destTrackId) continue
      const sourceKey = keyOf(mapping.sourceProvider, mapping.sourceTrackId)
      if (find(sourceKey) !== find(keyOf(primary.provider ?? '_', primary.id))) continue
      platformIds[mapping.sourceProvider] = mapping.sourceTrackId
      platformIds[mapping.destProvider] = mapping.destTrackId
    }

    const availability = linkedProviders.map(provider => {
      if (platformIds[provider]) {
        const present = members.some(m => m.provider === provider)
        return { provider, status: (present ? 'present' : 'matched') as AvailabilityStatus }
      }
      const related = mappings.filter(m => {
        if (m.destProvider !== provider) return false
        return members.some(member =>
          member.provider === m.sourceProvider && member.id === m.sourceTrackId,
        ) || platformIds[m.sourceProvider] === m.sourceTrackId
      })
      if (related.some(m => m.status === 'ambiguous')) return { provider, status: 'ambiguous' as const }
      if (related.some(m => m.status === 'unmatched')) return { provider, status: 'unmatched' as const }
      return { provider, status: 'unknown' as const }
    })

    display.push({
      ...primary,
      platformIds,
      availability,
    })
  }

  return display
}

export async function resolveDestTrackId(
  orderedId: string,
  destProvider: string,
  liveIds: Set<string>,
): Promise<string | null> {
  if (liveIds.has(orderedId)) return orderedId

  const { data: asSource, error: sourceErr } = await supabaseAdmin
    .from('track_mappings')
    .select('source_provider, source_track_id, dest_provider, dest_track_id, status')
    .eq('status', 'matched')
    .eq('source_track_id', orderedId)
    .eq('dest_provider', destProvider)

  const { data: asDest, error: destErr } = await supabaseAdmin
    .from('track_mappings')
    .select('source_provider, source_track_id, dest_provider, dest_track_id, status')
    .eq('status', 'matched')
    .eq('dest_track_id', orderedId)
    .eq('source_provider', destProvider)

  if (sourceErr || destErr) {
    log('warn', 'resolveDestTrackId lookup failed', {
      orderedId,
      destProvider,
      error: sourceErr?.message ?? destErr?.message,
    })
    return null
  }

  const rows = [...((asSource ?? []) as MappingRow[]), ...((asDest ?? []) as MappingRow[])]
  for (const row of rows) {
    const destId = row.dest_provider === destProvider ? row.dest_track_id : row.source_track_id
    if (destId && liveIds.has(destId)) return destId
  }
  return null
}
