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
