export const PROVIDER_RATE_LIMITED = 'PROVIDER_RATE_LIMITED'

export class ProviderRateLimitError extends Error {
  readonly code = PROVIDER_RATE_LIMITED
  readonly retryAfterSeconds: number
  readonly retryAt: Date

  constructor(retryAfterSeconds: number, providerDisplayName = 'A music service') {
    const seconds = Math.max(1, Math.ceil(retryAfterSeconds))
    const retryAt = new Date(Date.now() + seconds * 1000)
    super(
      `${providerDisplayName} is rate limiting requests. Try again ${formatRetryAfter(seconds)} (by ${retryAt.toLocaleTimeString()}).`,
    )
    this.name = 'ProviderRateLimitError'
    this.retryAfterSeconds = seconds
    this.retryAt = retryAt
  }
}

export function isProviderRateLimitError(err: unknown): err is ProviderRateLimitError {
  return err instanceof ProviderRateLimitError
}

export function providerErrorHttp(err: unknown): { status: number; message: string; code: string } | null {
  if (isProviderRateLimitError(err)) {
    return { status: 429, message: err.message, code: err.code }
  }
  return null
}

export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `in ${seconds} second${seconds === 1 ? '' : 's'}`
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? '' : 's'}`
  const hours = Math.max(1, Math.round(minutes / 60))
  if (hours < 24) return `in about ${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.max(1, Math.round(hours / 24))
  return `in about ${days} day${days === 1 ? '' : 's'}`
}
