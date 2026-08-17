import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  disablePwaDebug,
  getPwaDebugSnapshot,
  isPwaDebugEnabled,
  markPwaNavigation,
} from '../lib/pwa-debug'

export function PwaDebugOverlay() {
  const location = useLocation()
  const [open, setOpen] = useState(() => isPwaDebugEnabled())
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!open) return
    markPwaNavigation('router')
    setTick(n => n + 1)
  }, [location.pathname, location.search, open])

  useEffect(() => {
    if (!open) return
    const sync = () => setTick(n => n + 1)
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [open])

  if (!open) return null

  const snap = getPwaDebugSnapshot()
  const rows: [string, string][] = [
    ['matrix', 'A BrowserRouter'],
    ['route', `${location.pathname}${location.search}`],
    ['path', String(snap.pathname)],
    ['standalone', String(snap.standalone)],
    ['nav.standalone', String(snap.navigatorStandalone)],
    ['display-mode', String(snap.displayModeStandalone)],
    ['history', String(snap.historyLength)],
    ['visibility', String(snap.visibility)],
    ['online', String(snap.online)],
    ['navKind', String(snap.navKind)],
  ]

  return (
    <div className="sl-pwa-debug" role="note" aria-label="PWA debug">
      <div className="sl-pwa-debug-title">
        PWA debug
        <button
          type="button"
          className="sl-icon-button"
          aria-label="Dismiss PWA debug"
          onClick={() => {
            disablePwaDebug()
            setOpen(false)
          }}
          style={{ width: 28, height: 28, minWidth: 28, minHeight: 28 }}
        >
          ×
        </button>
      </div>
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          {value}
        </div>
      ))}
    </div>
  )
}
