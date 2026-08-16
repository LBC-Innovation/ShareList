const GRAVATAR_HOST = /^(?:www\.|\d+\.)?gravatar\.com$/i
const GRAVATAR_IMAGE_PREFIXES = ['/avatar/', '/userimage/']

const resolvedCache = new Map<string, string | null>()

function coerceUrl(raw: string): string {
  const trimmed = raw.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^(?:www\.)?gravatar\.com\//i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}

function gravatarSlug(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (GRAVATAR_IMAGE_PREFIXES.some(prefix => path.startsWith(prefix))) return null
  const slug = path.replace(/^\//, '').replace(/\.json$/i, '').split('/')[0]
  if (!slug || slug === 'avatar' || slug === 'userimage') return null
  return slug
}

function withSize(url: string, size: number): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set('s', String(size))
    return parsed.toString()
  } catch {
    return url
  }
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function profileUrlFromJson(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  if (typeof record['profile_url'] === 'string') return record['profile_url']
  const entry = record['entry']
  if (!Array.isArray(entry) || entry.length === 0 || typeof entry[0] !== 'object' || !entry[0]) {
    return null
  }
  const first = entry[0] as Record<string, unknown>
  if (typeof first['profileUrl'] === 'string') return first['profileUrl']
  if (typeof first['preferredUsername'] === 'string') {
    return `https://gravatar.com/${first['preferredUsername']}`
  }
  return null
}

/** Looks up the public Gravatar profile URL for an email address. */
export async function fetchGravatarProfileUrl(
  email: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const hash = await sha256Hex(email.trim().toLowerCase())
  try {
    const response = await fetch(`https://gravatar.com/${hash}.json`, { signal })
    if (!response.ok) return null
    return profileUrlFromJson(await response.json())
  } catch {
    return null
  }
}

/**
 * Opens Gravatar's Quick Editor popup so the user can sign in (email +
 * verification code) without copying a URL. Returns false if the popup
 * was blocked.
 */
export function openGravatarQuickEditor(
  email: string,
  handlers: { onClosed?: () => void; onProfileUpdated?: () => void } = {},
): boolean {
  const name = `GravatarQuickEditor_${Date.now()}`
  const width = 400
  const height = 720
  const left = window.screenLeft + (window.outerWidth - width) / 2
  const top = window.screenTop + (window.outerHeight - height) / 2
  const url = `https://gravatar.com/profile?email=${encodeURIComponent(email)}&scope=${encodeURIComponent('avatars')}&is_quick_editor=true`
  const popup = window.open(
    url,
    name,
    `popup,width=${width},height=${height},top=${top},left=${left}`,
  )
  if (!popup) return false

  const onMessage = (event: MessageEvent) => {
    if (!/https:\/\/([a-z-]{2,5}\.)?gravatar\.com/.test(event.origin)) return
    if (event.data?.name !== name) return
    handlers.onProfileUpdated?.()
  }
  window.addEventListener('message', onMessage)

  const timer = window.setInterval(() => {
    if (!popup.closed) return
    window.clearInterval(timer)
    window.removeEventListener('message', onMessage)
    handlers.onClosed?.()
  }, 500)

  return true
}

function thumbnailFromProfileJson(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  if (typeof record['avatar_url'] === 'string') return record['avatar_url']
  const entry = record['entry']
  if (!Array.isArray(entry) || entry.length === 0 || typeof entry[0] !== 'object' || !entry[0]) {
    return null
  }
  const first = entry[0] as Record<string, unknown>
  if (typeof first['thumbnailUrl'] === 'string') return first['thumbnailUrl']
  if (typeof first['thumbnail_url'] === 'string') return first['thumbnail_url']
  return null
}

/**
 * Turns a stored avatar value (direct image URL or Gravatar profile page)
 * into an URL that an <img> can load. Gravatar profile links like
 * https://gravatar.com/username return HTML, so those are resolved via
 * Gravatar's public JSON profile to the account's thumbnail image.
 */
export async function resolveAvatarSrc(
  raw: string | null | undefined,
  signal?: AbortSignal,
  size = 128,
): Promise<string | null> {
  if (!raw?.trim()) return null

  const cacheKey = `${raw.trim()}|${size}`
  if (resolvedCache.has(cacheKey)) return resolvedCache.get(cacheKey) ?? null

  let parsed: URL
  try {
    parsed = new URL(coerceUrl(raw))
  } catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null

  const isGravatar = GRAVATAR_HOST.test(parsed.hostname)
  const path = parsed.pathname.replace(/\/+$/, '') || '/'
  const alreadyImage = isGravatar && GRAVATAR_IMAGE_PREFIXES.some(prefix => path.startsWith(prefix))

  if (!isGravatar || alreadyImage) {
    const direct = isGravatar ? withSize(parsed.toString(), size) : parsed.toString()
    resolvedCache.set(cacheKey, direct)
    return direct
  }

  const slug = gravatarSlug(parsed.pathname)
  if (!slug) return null

  try {
    const response = await fetch(`https://gravatar.com/${encodeURIComponent(slug)}.json`, { signal })
    if (!response.ok) {
      if (response.status === 404) resolvedCache.set(cacheKey, null)
      return null
    }
    const thumbnail = thumbnailFromProfileJson(await response.json())
    const resolved = thumbnail ? withSize(thumbnail, size) : null
    resolvedCache.set(cacheKey, resolved)
    return resolved
  } catch {
    return null
  }
}
