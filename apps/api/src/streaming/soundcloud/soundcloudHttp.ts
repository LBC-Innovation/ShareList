/**
 * Serial SoundCloud API client with 429 backoff.
 *
 * Access tokens are short-lived; callers must pass a fresh Authorization header.
 * Do not call /tracks/:id/stream — ShareList never plays audio.
 */

import { ProviderRateLimitError } from '../errors'

const MIN_GAP_MS = 250

let rateLimitedUntilMs = 0
let chain: Promise<void> = Promise.resolve()
let lastStartedAt = 0

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseRetryAfterSeconds(header: string | null): number {
  if (!header) return 2
  const trimmed = header.trim()
  const asNumber = Number(trimmed)
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return Math.max(1, Math.ceil(asNumber))
  }
  const asDate = Date.parse(trimmed)
  if (!Number.isNaN(asDate)) {
    return Math.max(1, Math.ceil((asDate - Date.now()) / 1000))
  }
  return 2
}

function assertNotRateLimited(): void {
  const remainingMs = rateLimitedUntilMs - Date.now()
  if (remainingMs > 0) {
    throw new ProviderRateLimitError(remainingMs / 1000, 'SoundCloud')
  }
}

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    assertNotRateLimited()
    const wait = MIN_GAP_MS - (Date.now() - lastStartedAt)
    if (wait > 0) await sleep(wait)
    lastStartedAt = Date.now()
    return job()
  })
  chain = run.then(() => undefined, () => undefined)
  return run
}

export async function soundcloudFetch(url: string, init: RequestInit = {}): Promise<Response> {
  assertNotRateLimited()
  return enqueue(async () => {
    assertNotRateLimited()
    const res = await fetch(url, init)
    if (res.status === 429) {
      const retryAfterSeconds = parseRetryAfterSeconds(res.headers.get('Retry-After'))
      rateLimitedUntilMs = Date.now() + retryAfterSeconds * 1000
      console.log(JSON.stringify({
        level: 'warn',
        message: 'SoundCloud rate limited',
        retryAfterSeconds,
        retryAt: new Date(rateLimitedUntilMs).toISOString(),
        url,
      }))
      throw new ProviderRateLimitError(retryAfterSeconds, 'SoundCloud')
    }
    return res
  })
}
