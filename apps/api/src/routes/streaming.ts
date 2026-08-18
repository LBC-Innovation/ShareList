/**
 * Streaming service REST routes.
 *
 * All routes are provider-agnostic — they delegate to whichever StreamingProvider
 * is registered under the :provider path segment.
 *
 * Route overview:
 *   GET  /streaming/providers               — list all registered providers
 *   GET  /streaming/connected               — list user's connected services      [auth]
 *   GET  /streaming/:provider/auth-url      — get auth / redirect URL             [auth]
 *   GET  /streaming/:provider/callback      — OAuth redirect callback (Spotify)   [no auth, state-verified]
 *   POST /streaming/:provider/callback      — In-page auth callback (Apple Music) [auth]
 *   GET  /streaming/:provider/playlists     — fetch user's playlists              [auth]
 *   DELETE /streaming/:provider             — disconnect provider                  [auth]
 */

import { Router, type Request, type Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { clientOrigins, resolveReturnOrigin, resolveProviderRedirectUri } from '../lib/origins'
import { getProvider, listProviders } from '../streaming/registry'
import { getConnectedProviders, verifyState } from '../streaming/oauthHelpers'
import { providerErrorHttp } from '../streaming/errors'

// Side-effect imports — register all providers with the registry
import '../streaming/spotify'
import '../streaming/apple-music'
import '../streaming/soundcloud'

const router = Router()

function log(level: string, message: string, ctx: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level, message, ...ctx }))
}

// ── GET /streaming/providers ──────────────────────────────────────────────────

router.get('/providers', requireAuth, (_req: Request, res: Response) => {
  const providers = listProviders().map(p => ({
    name: p.name,
    displayName: p.displayName,
  }))
  res.json({ data: providers, error: null })
})

// ── GET /streaming/connected ──────────────────────────────────────────────────

router.get('/connected', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const connected = await getConnectedProviders(userId)
    const data = await Promise.all(connected.map(async row => {
      if (row.providerEmail) return row
      try {
        const provider = getProvider(row.provider)
        if (!provider.syncAccountEmail) return row
        const providerEmail = await provider.syncAccountEmail(userId)
        return { ...row, providerEmail }
      } catch (err) {
        log('warn', 'syncAccountEmail failed', {
          userId,
          provider: row.provider,
          error: err instanceof Error ? err.message : String(err),
        })
        return row
      }
    }))
    res.json({ data, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'getConnectedProviders failed', { userId: req.user?.id, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

// ── GET /streaming/:provider/auth-url ─────────────────────────────────────────

router.get('/:provider/auth-url', requireAuth, async (req: Request, res: Response) => {
  const { provider } = req.params as { provider: string }
  try {
    const p = getProvider(provider)
    const requestedOrigin = typeof req.query['returnOrigin'] === 'string' ? req.query['returnOrigin'] : undefined
    const returnOrigin = resolveReturnOrigin(req, requestedOrigin)
    const redirectUri = (provider === 'spotify' || provider === 'soundcloud')
      ? resolveProviderRedirectUri(req, provider)
      : undefined
    log('info', 'getAuthUrl', { provider, returnOrigin, redirectUri })
    const url = await p.getAuthUrl(req.user!.id, { returnOrigin, redirectUri })
    res.json({ data: { url }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.startsWith('Unknown streaming provider') ? 400 : 500
    log('error', 'getAuthUrl failed', { provider, userId: req.user?.id, error: message })
    res.status(status).json({ data: null, error: { message } })
  }
})

// ── GET /streaming/:provider/callback ─────────────────────────────────────────
//
// Handles redirect-based OAuth flows (Spotify).  The browser is redirected here
// by Spotify with ?code=…&state=… query params.  On success we redirect the
// browser to the frontend success page; on failure to the error page.

router.get('/:provider/callback', async (req: Request, res: Response) => {
  const { provider } = req.params as { provider: string }
  const { code, state, error: oauthError } = req.query as Record<string, string | undefined>
  const frontend = (parsedState?: { returnOrigin?: string }) =>
    parsedState?.returnOrigin && clientOrigins().includes(parsedState.returnOrigin)
      ? parsedState.returnOrigin
      : resolveReturnOrigin(req)

  // Provider denied access
  if (oauthError) {
    log('warn', 'OAuth provider returned error', { provider, oauthError })
    res.redirect(`${frontend()}/settings/streaming?error=${encodeURIComponent(oauthError)}&provider=${provider}`)
    return
  }

  if (!code || !state) {
    res.redirect(`${frontend()}/settings/streaming?error=missing_params&provider=${provider}`)
    return
  }

  try {
    const oauthState = verifyState(state)
    const p = getProvider(provider)
    await p.handleCallback(code, state)
    log('info', 'OAuth callback success', { provider, returnOrigin: frontend(oauthState) })
    res.redirect(`${frontend(oauthState)}/settings/streaming?connected=${provider}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'OAuth callback failed', { provider, error: message })
    let returnTo = frontend()
    if (state) {
      try { returnTo = frontend(verifyState(state)) } catch { /* keep fallback */ }
    }
    res.redirect(`${returnTo}/settings/streaming?error=${encodeURIComponent(message)}&provider=${provider}`)
  }
})

// ── POST /streaming/:provider/callback ────────────────────────────────────────
//
// Handles in-page auth flows (Apple Music).  The frontend POSTs the Music User
// Token along with the state parameter it received from getAuthUrl.

router.post('/:provider/callback', requireAuth, async (req: Request, res: Response) => {
  const { provider } = req.params as { provider: string }
  const { code, state } = req.body as { code?: string; state?: string }

  if (!code || !state) {
    res.status(400).json({ data: null, error: { message: 'Missing required fields: code, state' } })
    return
  }

  try {
    const p = getProvider(provider)
    const result = await p.handleCallback(code, state)
    log('info', 'In-page auth callback success', { provider, userId: req.user?.id })
    res.json({ data: result, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.startsWith('Unknown streaming provider') ? 400 : 500
    log('error', 'In-page auth callback failed', { provider, userId: req.user?.id, error: message })
    res.status(status).json({ data: null, error: { message } })
  }
})

// ── GET /streaming/:provider/playlists ────────────────────────────────────────

router.get('/:provider/playlists', requireAuth, async (req: Request, res: Response) => {
  const { provider } = req.params as { provider: string }
  try {
    const p = getProvider(provider)
    const playlists = await p.getPlaylists(req.user!.id)
    res.json({ data: playlists, error: null })
  } catch (err) {
    const limited = providerErrorHttp(err)
    if (limited) {
      log('warn', 'getPlaylists failed', { provider, userId: req.user?.id, error: limited.message, code: limited.code })
      res.status(limited.status).json({ data: null, error: { message: limited.message, code: limited.code } })
      return
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.startsWith('Unknown streaming provider') ? 400 : 500
    log('error', 'getPlaylists failed', { provider, userId: req.user?.id, error: message })
    res.status(status).json({ data: null, error: { message } })
  }
})

// ── DELETE /streaming/:provider ───────────────────────────────────────────────

router.delete('/:provider', requireAuth, async (req: Request, res: Response) => {
  const { provider } = req.params as { provider: string }
  try {
    const p = getProvider(provider)
    await p.disconnect(req.user!.id)
    log('info', 'Provider disconnected', { provider, userId: req.user?.id })
    res.json({ data: { disconnected: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.startsWith('Unknown streaming provider') ? 400 : 500
    log('error', 'disconnect failed', { provider, userId: req.user?.id, error: message })
    res.status(status).json({ data: null, error: { message } })
  }
})

export default router
