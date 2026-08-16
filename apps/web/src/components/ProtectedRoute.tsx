import { Navigate } from 'react-router-dom'
import { Flex, Spin } from 'antd'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
        <Spin size="large" />
      </Flex>
    )
  }
  if (!user) return <Navigate to="/signin" replace />
  return <>{children}</>
}
