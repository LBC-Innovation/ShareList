import type { ReactNode } from 'react'
import { StatusBanner } from './StatusBanner'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="sl-auth-shell">
      <StatusBanner />
      {children}
    </div>
  )
}
