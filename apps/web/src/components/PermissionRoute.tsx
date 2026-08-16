import { Navigate } from 'react-router-dom'
import { Flex, Spin } from 'antd'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

interface Props {
  permission: string
  children: ReactNode
}

export function PermissionRoute({ permission, children }: Props) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
        <Spin size="large" />
      </Flex>
    )
  }
  if (!user) return <Navigate to="/signin" replace />
  if (!user.permissions.includes(permission)) return <Navigate to="/" replace />
  return <>{children}</>
}
