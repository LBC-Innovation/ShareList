import { useEffect, useState } from 'react'
import { Layout, Typography, Button, Tag, Flex, Card, Skeleton, Alert } from 'antd'
import { PlusOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import * as api from '../lib/api'
import type { AdminUser } from '../lib/api'
import { UserManagementPanel } from '../components/UserManagementPanel'
import { CreateUserModal } from '../components/CreateUserModal'

const { Content } = Layout
const { Text, Title } = Typography

export function AdminUsers() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const canAdd = me?.permissions.includes('usermanage:add') ?? false

  const load = async () => {
    setIsLoading(true)
    const result = await api.listAdminUsers()
    setIsLoading(false)
    if (api.isError(result)) { setLoadError(result.error.message); return }
    setUsers(result.data)
  }

  useEffect(() => { void load() }, [])

  const handleUpdate = (updatedUser: AdminUser) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))
    setSelectedUser(updatedUser) // keep modal open
  }

  const handleDelete = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId))
    setSelectedUser(null)
  }

  const handleCreated = async () => {
    setShowCreateModal(false)
    await load()
  }

  if (loadError) {
    return (
      <Content style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>
        <Alert message={`Failed to load users: ${loadError}`} type="error" showIcon style={{ borderRadius: '12px' }} />
      </Content>
    )
  }

  return (
    <Content style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 24px' }}>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: '24px' }}>
        <Title level={1} style={{ color: '#F1F5F9', margin: 0, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
          User Management
        </Title>
        {canAdd && (
          <Button
            icon={<PlusOutlined />}
            onClick={() => setShowCreateModal(true)}
            style={{
              background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
              border: 'none', borderRadius: '10px', height: '40px', padding: '0 20px',
              fontSize: '14px', fontWeight: 700, color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(56, 189, 248, 0.25)',
            }}
          >
            Add User
          </Button>
        )}
      </Flex>

      {/* User table card */}
      <Card
        style={{
          background: 'rgba(28, 31, 33, 0.4)',
          border: '1px solid rgba(56, 189, 248, 0.1)',
          borderRadius: '16px',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: 0 } }}
      >
        {/* Table header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(56, 189, 248, 0.1)', background: 'rgba(17, 19, 20, 0.4)' }}>
          <Flex>
            <div style={{ flex: '1 1 35%', paddingRight: '16px' }}>
              <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>User</Text>
            </div>
            <div style={{ width: '110px', paddingRight: '16px' }}>
              <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</Text>
            </div>
            <div style={{ flex: '1 1 25%', paddingRight: '16px' }}>
              <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Permissions</Text>
            </div>
            <div style={{ width: '110px', paddingRight: '16px' }}>
              <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Joined</Text>
            </div>
            <div style={{ width: '100px' }} />
          </Flex>
        </div>

        {/* Rows */}
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={`skeleton-${index}`} style={{ padding: '14px 20px', borderBottom: index < 4 ? '1px solid rgba(56, 189, 248, 0.05)' : 'none' }}>
              <Skeleton.Input active style={{ width: '100%', height: '36px', borderRadius: '8px' }} />
            </div>
          ))
        ) : users.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <Text style={{ color: '#64748B' }}>No users found</Text>
          </div>
        ) : (
          users.map((user, index) => {
            const displayName = user.displayName ?? user.email ?? '?'
            const initials = displayName.charAt(0).toUpperCase()
            return (
              <div
                key={user.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: index < users.length - 1 ? '1px solid rgba(56, 189, 248, 0.05)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.05)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                onClick={() => setSelectedUser(user)}
              >
                <Flex align="center">
                  {/* User info */}
                  <Flex align="center" gap={12} style={{ flex: '1 1 35%', paddingRight: '16px', minWidth: 0 }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text style={{ color: '#F1F5F9', fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName}
                      </Text>
                      {!user.emailConfirmed ? (
                        <Tag
                          icon={<CloseCircleOutlined />}
                          style={{ fontSize: '12px', background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#FCD34D', padding: '2px 8px', borderRadius: '6px', margin: 0, lineHeight: '18px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          {user.email}
                        </Tag>
                      ) : (
                        <Text style={{ color: '#64748B', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {user.email}
                        </Text>
                      )}
                    </div>
                  </Flex>

                  {/* Status */}
                  <div style={{ width: '110px', paddingRight: '16px' }}>
                    <Tag style={{
                      background: user.status === 'active' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: user.status === 'active' ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                      color: user.status === 'active' ? '#4ADE80' : '#EF4444',
                      padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, margin: 0,
                    }}>
                      {user.status}
                    </Tag>
                  </div>

                  {/* Permissions */}
                  <div style={{ flex: '1 1 25%', paddingRight: '16px' }}>
                    {user.permissions.length > 0 ? (
                      <Text style={{ color: '#94A3B8', fontSize: '13px' }}>
                        {user.permissions.length} permission{user.permissions.length !== 1 ? 's' : ''}
                      </Text>
                    ) : (
                      <Text style={{ color: '#64748B', fontSize: '13px' }}>None</Text>
                    )}
                  </div>

                  {/* Joined */}
                  <div style={{ width: '110px', paddingRight: '16px' }}>
                    <Text style={{ color: '#94A3B8', fontSize: '13px' }}>
                      {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </div>

                  {/* Manage button */}
                  <div style={{ width: '100px' }}>
                    <Button
                      size="small"
                      onClick={(e) => { e.stopPropagation(); setSelectedUser(user) }}
                      style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38BDF8', borderRadius: '8px', height: '32px', padding: '0 14px', fontWeight: 600, fontSize: '13px' }}
                    >
                      Manage
                    </Button>
                  </div>
                </Flex>
              </div>
            )
          })
        )}
      </Card>

      {/* User management modal */}
      {selectedUser && (
        <UserManagementPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {/* Create user modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </Content>
  )
}
