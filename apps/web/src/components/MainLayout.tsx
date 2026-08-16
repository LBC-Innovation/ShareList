import { Flex, Spin } from 'antd'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Layout } from 'antd'
import { TopNavigation } from './TopNavigation'
import { BottomNavigation } from './BottomNavigation'
import { useAuth } from '../context/AuthContext'

export function MainLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '100vh', background: '#111314' }}>
        <Spin size="large" />
      </Flex>
    )
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/signin?next=${next}`} replace />
  }

  return (
    <Layout style={{
      minHeight: '100vh',
      background: '#111314',
      position: 'relative',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Background radial gradient */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        pointerEvents: 'none',
        background: 'radial-gradient(circle at 20% 10%, rgba(56, 189, 248, 0.08) 0%, rgba(56, 189, 248, 0.03) 40%, transparent 70%)',
        zIndex: 0,
      }} />

      <TopNavigation />

      {/* Page content — padded for fixed top + bottom nav */}
      <div style={{ paddingTop: '57px', paddingBottom: '72px', position: 'relative', zIndex: 1 }}>
        <Outlet />
      </div>

      <BottomNavigation />
    </Layout>
  )
}
