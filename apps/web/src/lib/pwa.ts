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

export type ClientOs = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'other'

export function getClientOs(): ClientOs {
  if (typeof navigator === 'undefined') return 'other'
  if (isIosDevice()) return 'ios'
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  if (/Win/i.test(ua)) return 'windows'
  if (/Mac/i.test(ua)) return 'macos'
  if (/CrOS/i.test(ua) || /Linux/i.test(ua)) return 'linux'
  return 'other'
}

export function isIosStandalone(): boolean {
  return isIosDevice() && isStandaloneDisplay()
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
  document.documentElement.classList.toggle('sl-ios', isIosDevice())
}

function largeViewportHeight(): number {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none'
  document.documentElement.appendChild(probe)
  const height = probe.getBoundingClientRect().height
  probe.remove()
  return height || window.innerHeight
}

function readSafeInset(side: 'top' | 'bottom'): number {
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.position = 'fixed'
  probe.style.visibility = 'hidden'
  probe.style.pointerEvents = 'none'
  probe.style.setProperty(`padding-${side}`, `constant(safe-area-inset-${side})`)
  probe.style.setProperty(`padding-${side}`, `env(safe-area-inset-${side}, 0px)`)
  document.documentElement.appendChild(probe)
  const value = Number.parseFloat(getComputedStyle(probe).getPropertyValue(`padding-${side}`)) || 0
  probe.remove()
  return value
}

/**
 * Safari's layout viewport is the visible page (above the toolbar).
 * iOS Home Screen PWAs still *report* that same small viewport even though
 * the toolbar is gone, which leaves a toolbar-sized hole under the footer.
 * On iOS standalone only, size the frame to 100lvh / outerHeight.
 *
 * Desktop installed PWAs must not use outerHeight: that value includes the
 * window title bar, so the shell is taller than the visible frame and the
 * bottom nav is clipped. Desktop keeps position:fixed; inset:0.
 */
export function lockAppFrame(): void {
  const root = document.documentElement
  let frame = 0

  const apply = (): void => {
    frame = 0
    const ios = isIosDevice()
    const standalone = isStandaloneDisplay()
    const sat = readSafeInset('top')
    const sab = readSafeInset('bottom')
    root.style.setProperty('--sl-safe-top', `${sat || (ios && standalone ? 47 : 0)}px`)
    root.style.setProperty('--sl-safe-bottom', `${sab || (ios && standalone ? 34 : 0)}px`)

    if (ios && standalone) {
      const height = Math.max(
        largeViewportHeight(),
        window.outerHeight || 0,
        window.innerHeight,
      )
      root.style.setProperty('--sl-app-height', `${height}px`)
    } else {
      root.style.removeProperty('--sl-app-height')
    }
  }

  const sync = (): void => {
    if (frame) return
    frame = window.requestAnimationFrame(apply)
  }

  apply()
  window.addEventListener('resize', sync)
  window.addEventListener('orientationchange', sync)
  window.visualViewport?.addEventListener('resize', sync)
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
