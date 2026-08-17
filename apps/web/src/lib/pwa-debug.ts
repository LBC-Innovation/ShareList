const DEBUG_QUERY = 'pwaDebug'
const DEBUG_SESSION_KEY = 'sl_pwa_debug'

type NavKind = 'load' | 'router' | 'popstate' | 'anchor-same-origin' | 'anchor-external' | 'document'

let enabled = false
let lastNavKind: NavKind = 'load'
let lastExternalHref: string | null = null

function readStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

function snapshot(extra: Record<string, string | number | boolean | null> = {}): Record<string, string | number | boolean | null> {
  return {
    href: window.location.href,
    pathname: window.location.pathname,
    search: window.location.search,
    navigatorStandalone: ('standalone' in navigator)
      ? Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
      : null,
    displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches,
    standalone: readStandalone(),
    historyLength: window.history.length,
    visibility: document.visibilityState,
    online: navigator.onLine,
    navKind: lastNavKind,
    lastExternalHref,
    ...extra,
  }
}

function log(event: string, extra: Record<string, string | number | boolean | null> = {}): void {
  if (!enabled) return
  console.info(`[ShareList pwaDebug] ${event}`, snapshot(extra))
}

export function isPwaDebugEnabled(): boolean {
  return enabled
}

export function getPwaDebugSnapshot(): Record<string, string | number | boolean | null> {
  return snapshot()
}

export function markPwaNavigation(kind: NavKind, href?: string): void {
  lastNavKind = kind
  if (href) lastExternalHref = href
}

export function noteDocumentNavigation(href: string, reason: string): void {
  lastNavKind = 'document'
  lastExternalHref = href
  log(reason, { dest: href })
}

/**
 * Physical iPhone matrix (production HTTPS install only):
 * A. BrowserRouter as shipped
 * B. After viewport/safe-area deploy
 * C. MemoryRouter — only if A loses standalone after in-app navigate()
 *
 * At each route record standalone, display-mode, pathname, whether Safari chrome appears.
 */
export function initPwaDebug(): void {
  if (typeof window === 'undefined') return

  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get(DEBUG_QUERY) === '1') {
      sessionStorage.setItem(DEBUG_SESSION_KEY, '1')
    }
    enabled = sessionStorage.getItem(DEBUG_SESSION_KEY) === '1'
  } catch {
    enabled = new URLSearchParams(window.location.search).get(DEBUG_QUERY) === '1'
  }

  if (!enabled) return

  window.addEventListener('popstate', () => {
    markPwaNavigation('popstate')
    log('popstate')
  })

  window.addEventListener('pagehide', () => {
    log('pagehide')
  })

  window.addEventListener('pageshow', event => {
    log('pageshow', { persisted: event.persisted })
  })

  document.addEventListener('visibilitychange', () => {
    log('visibilitychange')
  })

  document.addEventListener('click', event => {
    const target = event.target
    if (!(target instanceof Element)) return
    const anchor = target.closest('a')
    if (!(anchor instanceof HTMLAnchorElement) || !anchor.href) return
    try {
      const url = new URL(anchor.href, window.location.href)
      if (url.origin === window.location.origin) markPwaNavigation('anchor-same-origin', url.href)
      else markPwaNavigation('anchor-external', url.href)
      log('anchor-click', { dest: url.href })
    } catch {
      // ignore malformed hrefs
    }
  }, true)

  log('init')
}

export function disablePwaDebug(): void {
  enabled = false
  try {
    sessionStorage.removeItem(DEBUG_SESSION_KEY)
  } catch {
    // ignore
  }
}
