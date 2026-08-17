const DISMISS_KEY = 'sl_pwa_install_dismissed'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type Listener = () => void

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<Listener>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isInstallDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissInstallPrompt(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // ignore quota / private-mode failures
  }
  emit()
}

export function applyStandaloneClass(): void {
  const standalone = isStandaloneDisplay()
  installed = standalone
  document.documentElement.classList.toggle('sl-standalone', standalone)
}

/**
 * Pin the app chrome to the visible iOS viewport.
 *
 * Standalone WebKit reports a shorter `100dvh` / `-webkit-fill-available` than
 * the layout viewport used for hit-testing. Mixing `top`, `bottom`, and `height`
 * on a `position: fixed` shell then paints the UI short (black gap under the
 * nav) while taps still land where the full-height box would be.
 *
 * `--sl-app-height` is the larger of `innerHeight` and `visualViewport.height`
 * so paint fills the same box taps already use.
 */
export function lockVisualViewport(): void {
  const root = document.documentElement
  let frame = 0

  const apply = (): void => {
    frame = 0
    const vv = window.visualViewport
    const width = Math.max(window.innerWidth, vv?.width ?? 0)
    const height = Math.max(window.innerHeight, vv?.height ?? 0)
    root.style.setProperty('--sl-vv-top', `${vv?.offsetTop ?? 0}px`)
    root.style.setProperty('--sl-vv-left', `${vv?.offsetLeft ?? 0}px`)
    root.style.setProperty('--sl-app-width', `${width}px`)
    root.style.setProperty('--sl-app-height', `${height}px`)
    root.classList.add('sl-vv-locked')
  }

  const sync = (): void => {
    if (frame) return
    frame = window.requestAnimationFrame(apply)
  }

  apply()
  window.visualViewport?.addEventListener('resize', sync)
  window.visualViewport?.addEventListener('scroll', sync)
  window.addEventListener('resize', sync)
  window.addEventListener('orientationchange', sync)
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt
}

export function isAppInstalled(): boolean {
  return installed || isStandaloneDisplay()
}

export function subscribePwaInstall(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function initPwaInstallListener(): void {
  installed = isStandaloneDisplay()
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferredPrompt = null
    emit()
  })
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false
  await deferredPrompt.prompt()
  const result = await deferredPrompt.userChoice
  deferredPrompt = null
  if (result.outcome === 'accepted') installed = true
  emit()
  return result.outcome === 'accepted'
}
