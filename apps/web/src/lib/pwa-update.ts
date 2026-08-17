import { registerSW } from 'virtual:pwa-register'

type Listener = () => void

const listeners = new Set<Listener>()
let needRefresh = false
let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | undefined

function emit(): void {
  for (const listener of listeners) listener()
}

export function isPwaUpdatePending(): boolean {
  return needRefresh
}

export function subscribePwaUpdate(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export async function applyPwaUpdate(): Promise<void> {
  await applyUpdate?.(true)
}

export function initPwaUpdateListener(): void {
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true
      emit()
    },
    onRegisteredSW() {
      // registration succeeded; no UI
    },
  })
}
