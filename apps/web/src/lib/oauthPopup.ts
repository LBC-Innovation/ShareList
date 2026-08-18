export const OAUTH_MESSAGE_TYPE = 'sharelist-oauth'

export type OAuthPopupResult =
  | { ok: true; provider: string }
  | { ok: false; provider: string; error: string }

interface OAuthPopupMessage {
  type: string
  provider?: string
  ok?: boolean
  error?: string
}

export function describeOAuthError(
  error: string,
  provider?: string,
  redirectUri?: string,
): string {
  const decoded = decodeURIComponent(error.replace(/\+/g, ' ')).trim()
  const key = decoded.toLowerCase()
  const name = provider === 'soundcloud'
    ? 'SoundCloud'
    : provider === 'spotify'
      ? 'Spotify'
      : (provider ?? 'The music service')
  const uriHint = redirectUri ? ` It must match exactly: ${redirectUri}` : ''

  if (key === 'popup_closed') {
    if (provider === 'soundcloud') {
      return `SoundCloud didn't finish connecting. If you saw a blank page, the Redirect URI on your SoundCloud app is wrong.${uriHint}`
    }
    return 'The authorization window was closed before connecting. Please try again.'
  }
  if (key.includes('redirect_uri')) {
    return `${name} rejected the redirect URI.${uriHint} Update it on the ${name} developer app, then try again.`
  }
  if (key === 'access_denied' || key.includes('denied') || key.includes('cancel')) {
    return 'Authorization was cancelled.'
  }
  if (key === 'missing_params') {
    return 'The connection was incomplete. Please try again.'
  }
  return decoded
}

export function waitForOAuthPopup(
  url: string,
  provider: string,
  redirectUri?: string,
  signal?: AbortSignal,
): Promise<OAuthPopupResult> {
  return new Promise(resolve => {
    const popup = window.open(
      url,
      'sharelist-oauth',
      'popup=yes,width=520,height=740,scrollbars=yes',
    )
    if (!popup) {
      resolve({
        ok: false,
        provider,
        error: 'ShareList needs a popup to connect this account. Allow popups for this site, then try again.',
      })
      return
    }

    let settled = false
    let timer: number | undefined
    const finish = (result: OAuthPopupResult) => {
      if (settled) return
      settled = true
      window.removeEventListener('message', onMessage)
      if (timer !== undefined) window.clearInterval(timer)
      signal?.removeEventListener('abort', onAbort)
      try {
        if (!popup.closed) popup.close()
      } catch {
        // Popup may already be gone.
      }
      resolve(result)
    }

    const onAbort = () => {
      finish({
        ok: false,
        provider,
        error: 'Authorization was cancelled.',
      })
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data = event.data as OAuthPopupMessage
      if (data?.type !== OAUTH_MESSAGE_TYPE) return
      if (data.ok) {
        finish({ ok: true, provider: data.provider ?? provider })
        return
      }
      finish({
        ok: false,
        provider: data.provider ?? provider,
        error: describeOAuthError(
          data.error ?? 'Connection failed',
          data.provider ?? provider,
          redirectUri,
        ),
      })
    }

    window.addEventListener('message', onMessage)
    signal?.addEventListener('abort', onAbort)
    if (signal?.aborted) {
      onAbort()
      return
    }
    timer = window.setInterval(() => {
      if (!popup.closed) return
      finish({
        ok: false,
        provider,
        error: describeOAuthError('popup_closed', provider, redirectUri),
      })
    }, 400)
  })
}

/** If this Settings page is the OAuth popup, notify the opener and close. */
export function notifyOAuthOpenerAndClose(): boolean {
  const params = new URLSearchParams(window.location.search)
  const connected = params.get('connected')
  const error = params.get('error')
  const errorProvider = params.get('provider')
  if (!connected && !error) return false
  if (!window.opener || window.opener.closed) return false

  const payload: OAuthPopupMessage = {
    type: OAUTH_MESSAGE_TYPE,
    provider: connected ?? errorProvider ?? '',
    ok: Boolean(connected),
    error: error ?? undefined,
  }
  window.opener.postMessage(payload, window.location.origin)
  window.close()
  return true
}
