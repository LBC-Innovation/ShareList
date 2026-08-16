import { useState } from 'react'
import { Modal, Button, Space, Form, Input, Switch, Typography, Flex, Alert } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import * as api from '../lib/api'

const { Title, Text } = Typography

const PERMISSION_META = [
  { key: 'usermanage:listusers', name: 'View users', description: 'Can access the user management page' },
  { key: 'usermanage:add', name: 'Create users', description: 'Can create new accounts' },
  { key: 'usermanage:suspend', name: 'Suspend users', description: 'Can suspend and unsuspend accounts' },
  { key: 'usermanage:updatepassword', name: 'Reset passwords', description: 'Can reset passwords for other users' },
  { key: 'usermanage:deleteusers', name: 'Delete users', description: 'Can permanently delete accounts' },
  { key: 'usermanage:editpermissions', name: 'Edit permissions', description: 'Can grant or revoke permissions for other users' },
  { key: 'usermanage:selfmanage', name: 'Full self-management', description: 'Can manage all aspects of their own account' },
]

interface CreateUserModalProps {
  onClose: () => void
  onCreated: () => void
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <Title level={5} style={{ color: '#F1F5F9', margin: 0, marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>
        {title}
      </Title>
      {children}
    </div>
  )
}

export function CreateUserModal({ onClose, onCreated }: CreateUserModalProps) {
  const [form] = Form.useForm()
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePermissionToggle = (permKey: string, checked: boolean) => {
    setPermissions(checked ? [...permissions, permKey] : permissions.filter(p => p !== permKey))
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setError(null)
      setLoading(true)
      const result = await api.createAdminUser(values.email, values.password)
      setLoading(false)
      if (api.isError(result)) { setError(result.error.message); return }

      // If permissions were set, apply them to the new user
      if (permissions.length > 0) {
        await api.updateUserPermissions(result.data.id, permissions)
      }

      onCreated()
    } catch {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={true}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
      style={{ padding: 0 }}
      styles={{
        container: {
          background: 'rgba(28, 31, 33, 0.95)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          borderRadius: '16px',
          padding: 0,
          overflow: 'hidden',
        },
        body: { padding: 0, maxHeight: '80vh', overflowY: 'auto' },
        mask: { backdropFilter: 'blur(3px)', background: 'rgba(0, 0, 0, 0.4)' },
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px 24px', background: 'rgba(17, 19, 20, 0.6)', borderBottom: '1px solid rgba(56, 189, 248, 0.1)' }}>
        <Title level={4} style={{ margin: 0, color: '#F1F5F9', fontSize: '18px', fontWeight: 700 }}>
          Create New User
        </Title>
        <Text style={{ color: '#64748B', fontSize: '13px' }}>Set up account details and permissions</Text>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        <SectionCard title="Basic Information">
          <Form form={form} layout="vertical" requiredMark={false}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Form.Item
                name="email"
                label={<span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500 }}>Email Address</span>}
                rules={[{ required: true, message: 'Email required' }, { type: 'email', message: 'Invalid email' }]}
                style={{ marginBottom: 0 }}
              >
                <Input
                  prefix={<MailOutlined style={{ color: '#64748B', fontSize: '12px' }} />}
                  placeholder="user@example.com"
                  style={{ background: 'rgba(17, 19, 20, 0.8)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', color: '#F1F5F9', height: '36px', fontSize: '14px' }}
                />
              </Form.Item>
              <Form.Item
                name="password"
                label={<span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500 }}>Temporary Password</span>}
                rules={[{ required: true, message: 'Password required' }, { min: 6, message: 'Min 6 characters' }]}
                style={{ marginBottom: 0 }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#64748B', fontSize: '12px' }} />}
                  placeholder="Min 6 characters"
                  style={{ background: 'rgba(17, 19, 20, 0.8)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', color: '#F1F5F9', height: '36px', fontSize: '14px' }}
                />
              </Form.Item>
            </Space>
          </Form>
        </SectionCard>

        {/* Permissions */}
        <SectionCard title="Permissions">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {PERMISSION_META.map(perm => (
              <Flex
                key={perm.key}
                justify="space-between"
                align="center"
                style={{
                  padding: '10px 12px',
                  background: 'rgba(17, 19, 20, 0.6)',
                  border: permissions.includes(perm.key) ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid rgba(56, 189, 248, 0.1)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ flex: 1, marginRight: '12px' }}>
                  <Text style={{ color: '#F1F5F9', display: 'block', marginBottom: '1px', fontWeight: 500, fontSize: '13px' }}>
                    {perm.name}
                  </Text>
                  <Text style={{ color: '#64748B', fontSize: '12px' }}>{perm.description}</Text>
                </div>
                <Switch
                  size="small"
                  checked={permissions.includes(perm.key)}
                  onChange={(checked) => handlePermissionToggle(perm.key, checked)}
                />
              </Flex>
            ))}
          </Space>
        </SectionCard>

        {error && <Alert message={error} type="error" showIcon style={{ borderRadius: '10px', marginTop: '8px' }} />}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 24px', background: 'rgba(17, 19, 20, 0.6)', borderTop: '1px solid rgba(56, 189, 248, 0.1)' }}>
        <Flex gap={12} justify="flex-end">
          <Button
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '8px', height: '38px', padding: '0 20px', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            loading={loading}
            onClick={handleSubmit}
            style={{
              background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
              border: 'none', borderRadius: '8px', height: '38px', padding: '0 24px',
              fontWeight: 700, color: '#FFFFFF', fontSize: '13px',
              boxShadow: '0 4px 16px rgba(56, 189, 248, 0.25)',
            }}
          >
            Create User
          </Button>
        </Flex>
      </div>
    </Modal>
  )
}
