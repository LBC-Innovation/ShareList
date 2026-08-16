import type { Request } from 'express'

const LOCAL_ORIGIN = 'http://localhost:5173'
const PROD_ORIGIN = 'https://sharelist.lbcinnovation.com'

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return []
  return raw.split(',').map((value) => value.trim()).filter(Boolean)
}

export function isLocalhost(value: string): boolean {
  return value.includes('localhost') || value.includes('127.0.0.1')
}

function inProduction(): boolean {
  return Boolean(
    process.env['RENDER']
    || process.env['RENDER_SERVICE_ID']
    || process.env['VERCEL']
    || process.env['NODE_ENV'] === 'production',
  )
}

export function clientOrigins(): string[] {
  const configured = parseOrigins(process.env['CLIENT_ORIGIN'])
  if (configured.length > 0) return configured
  return inProduction() ? [PROD_ORIGIN] : [LOCAL_ORIGIN]
}

export function clientOrigin(): string {
  const origins = clientOrigins()
  if (inProduction()) {
    return origins.find(origin => !isLocalhost(origin)) ?? PROD_ORIGIN
  }
  return origins[0] ?? LOCAL_ORIGIN
}

/** Public origin of this API process for the incoming request (honors proxies). */
export function publicApiOrigin(req: Request): string {
  const forwardedHost = req.get('x-forwarded-host')
  const forwardedProto = req.get('x-forwarded-proto')
  const host = (forwardedHost ?? req.get('host') ?? '').split(',')[0]?.trim()
  const proto = forwardedProto?.split(',')[0]?.trim() || req.protocol || 'http'
  if (!host) return 'http://localhost:3001'
  return `${proto}://${host}`
}

function originFromReferer(referer: string | undefined): string | undefined {
  if (!referer) return undefined
  try {
    return new URL(referer).origin
  } catch {
    return undefined
  }
}

function firstAllowed(candidate: string | undefined, allowed: string[]): string | undefined {
  if (!candidate) return undefined
  return allowed.includes(candidate) ? candidate : undefined
}

/**
 * Frontend origin to send the browser back to after OAuth.
 * Prefers an explicit candidate (query/state), then Origin/Referer, then a
 * non-localhost allowlisted origin when the API request itself is not local.
 */
export function resolveReturnOrigin(req: Request, candidate?: string): string {
  const allowed = clientOrigins()
  const fromCandidate = firstAllowed(candidate, allowed)
  if (fromCandidate) return fromCandidate

  const fromHeader = firstAllowed(req.get('origin'), allowed)
    ?? firstAllowed(originFromReferer(req.get('referer')), allowed)
  if (fromHeader) return fromHeader

  if (!isLocalhost(publicApiOrigin(req))) {
    return allowed.find(origin => !isLocalhost(origin)) ?? PROD_ORIGIN
  }

  return allowed.find(origin => isLocalhost(origin)) ?? allowed[0] ?? LOCAL_ORIGIN
}

/**
 * Spotify callback URL that matches this API host. Never advertise localhost
 * when the authorize request arrived on a public host.
 */
export function resolveSpotifyRedirectUri(req: Request): string {
  const callbackPath = '/streaming/spotify/callback'
  const fromRequest = `${publicApiOrigin(req)}${callbackPath}`
  const configured = parseOrigins(process.env['SPOTIFY_REDIRECT_URI'])

  if (configured.includes(fromRequest)) return fromRequest

  const wantLocal = isLocalhost(fromRequest)
  const preferred = configured.find(uri => isLocalhost(uri) === wantLocal)
  if (preferred) return preferred

  if (!wantLocal) return fromRequest
  return configured[0] ?? fromRequest
}
