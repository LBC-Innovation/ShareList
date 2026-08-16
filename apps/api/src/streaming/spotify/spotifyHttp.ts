/**
 * Serial Spotify Web API client.
 *
 * Development Mode rate limits are app-wide, unpublished, and grow Retry-After
 * if we keep calling after a 429. Every api.spotify.com request goes through
 * this queue: one at a time, minimum gap, coalesced/cached GETs.
 */

import { ProviderRateLimitError } from '../errors'

const MIN_GAP_MS = 500
const GET_CACHE_TTL_MS = 45_000

let rateLimitedUntilMs = 0
let chain: Promise<void> = Promise.resolve()
let lastStartedAt = 0

const inflightGets = new Map<string, Promise<Response>>()
const getCache = new Map<string, {
  expiresAt: number
  status: number
  body: Buffer
  contentType: string
}>()

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseRetryAfterSeconds(header: string | null): number {
  if (!header) return 1
  const trimmed = header.trim()
  const asNumber = Number(trimmed)
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return Math.max(1, Math.ceil(asNumber))
  }
  const asDate = Date.parse(trimmed)
  if (!Number.isNaN(asDate)) {
    return Math.max(1, Math.ceil((asDate - Date.now()) / 1000))
  }
  return 1
}

function assertNotRateLimited(): void {
  const remainingMs = rateLimitedUntilMs - Date.now()
  if (remainingMs > 0) {
    throw new ProviderRateLimitError(remainingMs / 1000)
  }
}

function requestKey(method: string, url: string): string {
  return `${method} ${url}`
}

function bufferedResponse(status: number, body: Buffer, contentType: string): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': contentType },
  })
}

function invalidateCacheForUrl(url: string): void {
  const match = url.match(/\/playlists\/([^/?]+)/)
  if (!match) return
  const needle = `/playlists/${match[1]}`
  for (const key of [...getCache.keys()]) {
    if (key.includes(needle)) getCache.delete(key)
  }
}

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    assertNotRateLimited()
    const wait = MIN_GAP_MS - (Date.now() - lastStartedAt)
    if (wait > 0) {
      console.log(JSON.stringify({
        level: 'debug',
        message: 'Spotify throttle wait',
        waitMs: wait,
      }))
      await sleep(wait)
    }
    lastStartedAt = Date.now()
    return job()
  })
  chain = run.then(() => undefined, () => undefined)
  return run
}

export function invalidateSpotifyGetCache(playlistId?: string): void {
  if (!playlistId) {
    getCache.clear()
    return
  }
  const needle = `/playlists/${playlistId}`
  for (const key of [...getCache.keys()]) {
    if (key.includes(needle)) getCache.delete(key)
  }
}

/**
 * Fetches from api.spotify.com through the process-wide throttle.
 * GET responses are coalesced while in flight and cached briefly.
 */
export async function spotifyFetch(url: string, init: RequestInit = {}): Promise<Response> {
  assertNotRateLimited()
  const method = (init.method ?? 'GET').toUpperCase()
  const key = requestKey(method, url)

  if (method === 'GET') {
    const cached = getCache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      return bufferedResponse(cached.status, cached.body, cached.contentType)
    }
    const pending = inflightGets.get(key)
    if (pending) return pending.then(res => res.clone())
  }

  const job = enqueue(async () => {
    assertNotRateLimited()
    const res = await fetch(url, init)
    if (res.status === 429) {
      const retryAfterSeconds = parseRetryAfterSeconds(res.headers.get('Retry-After'))
      rateLimitedUntilMs = Date.now() + retryAfterSeconds * 1000
      console.log(JSON.stringify({
        level: 'warn',
        message: 'Spotify rate limited',
        retryAfterSeconds,
        retryAt: new Date(rateLimitedUntilMs).toISOString(),
        retryAfterHeader: res.headers.get('Retry-After'),
        url,
      }))
      throw new ProviderRateLimitError(retryAfterSeconds)
    }

    if (method === 'GET' && res.ok) {
      const body = Buffer.from(await res.arrayBuffer())
      const contentType = res.headers.get('content-type') ?? 'application/json'
      getCache.set(key, {
        expiresAt: Date.now() + GET_CACHE_TTL_MS,
        status: res.status,
        body,
        contentType,
      })
      return bufferedResponse(res.status, body, contentType)
    }

    if (method !== 'GET') invalidateCacheForUrl(url)
    return res
  })

  if (method === 'GET') {
    inflightGets.set(key, job)
    void job.finally(() => inflightGets.delete(key)).catch(() => undefined)
    return job.then(res => res.clone())
  }

  return job
}
