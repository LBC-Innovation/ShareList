export type ConnectivityStatus = 'online' | 'offline' | 'api-down'

type Listener = () => void

const listeners = new Set<Listener>()

let browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine
let apiReachable = true

function emit(): void {
  for (const listener of listeners) listener()
}

export function getConnectivity(): ConnectivityStatus {
  if (!browserOnline) return 'offline'
  if (!apiReachable) return 'api-down'
  return 'online'
}

export function isBrowserOnline(): boolean {
  return browserOnline
}

export function reportApiReachable(): void {
  if (apiReachable && browserOnline) return
  apiReachable = true
  emit()
}

export function reportApiUnreachable(): void {
  if (!apiReachable) return
  apiReachable = false
  emit()
}

export function subscribeConnectivity(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

async function pingHealth(): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL
  if (!apiUrl || !browserOnline) return
  try {
    const res = await fetch(`${apiUrl}/health`, { method: 'GET', cache: 'no-store' })
    if (res.ok) reportApiReachable()
    else reportApiUnreachable()
  } catch {
    reportApiUnreachable()
  }
}

export function initConnectivity(): void {
  if (typeof window === 'undefined') return
  browserOnline = navigator.onLine
  window.addEventListener('online', () => {
    browserOnline = true
    emit()
    void pingHealth()
  })
  window.addEventListener('offline', () => {
    browserOnline = false
    emit()
  })
  if (browserOnline) void pingHealth()
}
