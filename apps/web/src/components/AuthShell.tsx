import type { ReactNode } from 'react'

export function AuthShell({ children }: { children: ReactNode }) {
  return <div className="sl-auth-shell">{children}</div>
}
