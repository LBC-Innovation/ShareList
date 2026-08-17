import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { TopNavigation } from './TopNavigation'
import { BottomNavigation } from './BottomNavigation'
import { BootScreen } from './BootScreen'
import { useAuth } from '../context/AuthContext'

export function MainLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <BootScreen />
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/signin?next=${next}`} replace />
  }

  return (
    <div className="sl-app-shell">
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 20% 10%, rgba(56, 189, 248, 0.08) 0%, rgba(56, 189, 248, 0.03) 40%, transparent 70%)',
          zIndex: 0,
        }}
      />

      <TopNavigation />

      <div className="sl-app-shell-content">
        <div className="sl-page">
          <Outlet />
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}
