import type { StreamingTrack, TrackSearchQuery, TrackSearchResult } from '../streaming/types'

const MATCH_THRESHOLD = 0.72
const AMBIGUOUS_GAP = 0.08
const DURATION_TOLERANCE_MS = 3000

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\b(feat|ft|official|audio|video|lyrics|remix|mix|edit|version)\b\.?/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(value: string): Set<string> {
  return new Set(normalize(value).split(' ').filter(Boolean))
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection += 1
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

export function scoreTrackMatch(query: TrackSearchQuery, candidate: StreamingTrack): number {
  const qTitle = normalize(query.title)
  const cTitle = normalize(candidate.title)
  const titleExact = qTitle && qTitle === cTitle ? 1 : 0
  const titleScore = Math.max(titleExact, jaccard(tokens(query.title), tokens(candidate.title)))
  const artistScore = jaccard(tokens(query.artist), tokens(candidate.artist))
  const durationDelta = Math.abs((query.durationMs || 0) - (candidate.durationMs || 0))
  const durationScore = durationDelta <= DURATION_TOLERANCE_MS
    ? 1
    : Math.max(0, 1 - (durationDelta - DURATION_TOLERANCE_MS) / 30_000)

  return titleScore * 0.6 + artistScore * 0.25 + durationScore * 0.15
}

export function pickBestTrackMatch(
  query: TrackSearchQuery,
  candidates: StreamingTrack[],
): TrackSearchResult {
  if (query.isrc) {
    const isrc = query.isrc.trim().toUpperCase()
    const hits = candidates.filter(c => c.isrc?.trim().toUpperCase() === isrc)
    if (hits.length === 1 && hits[0]) {
      return { status: 'matched', track: hits[0], method: 'isrc' }
    }
    if (hits.length > 1) return { status: 'ambiguous' }
  }

  const ranked = candidates
    .map(track => ({ track, score: scoreTrackMatch(query, track) }))
    .sort((a, b) => b.score - a.score)

  const best = ranked[0]
  if (!best || best.score < MATCH_THRESHOLD) return { status: 'unmatched' }
  const second = ranked[1]
  if (second && best.score - second.score < AMBIGUOUS_GAP) return { status: 'ambiguous' }
  return { status: 'matched', track: best.track, method: 'metadata' }
}
