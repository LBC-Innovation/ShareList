import { useState } from 'react'
import { Modal, Tag, Button, Space, Form, Input, Switch, Typography, Flex } from 'antd'
import {
  CheckCircleOutlined, CloseCircleOutlined, CloseCircleFilled,
  LoadingOutlined, CloseOutlined, MailOutlined, LockOutlined, DeleteOutlined,
} from '@ant-design/icons'
import type { AdminUser } from '../lib/api'
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

interface UserManagementPanelProps {
  user: AdminUser
  onClose: () => void
  onUpdate: (user: AdminUser) => void
  onDelete: (userId: string) => void
}

export function UserManagementPanel({ user, onClose, onUpdate, onDelete }: UserManagementPanelProps) {
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [localUser, setLocalUser] = useState<AdminUser>(user)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const [loadingStates, setLoadingStates] = useState({
    saveProfile: false,
    verifyEmail: false,
    revokeVerification: false,
    sendMagicLink: false,
    setPassword: false,
    toggleStatus: false,
    deleteAccount: false,
  })

  const [actionResults, setActionResults] = useState<{ [key: string]: 'success' | 'error' | null }>({})
  const [permissionLoading, setPermissionLoading] = useState<{ [key: string]: boolean }>({})
  const [permissionResults, setPermissionResults] = useState<{ [key: string]: 'success' | 'error' | null }>({})

  const setLoading = (key: string, val: boolean) => setLoadingStates(prev => ({ ...prev, [key]: val }))
  const setResult = (key: string, val: 'success' | 'error' | null) => setActionResults(prev => ({ ...prev, [key]: val }))
  const clearResult = (key: string, delay: number) => setTimeout(() => setResult(key, null), delay)

  const patch = (changes: Partial<AdminUser>) => {
    const updated = { ...localUser, ...changes }
    setLocalUser(updated)
    onUpdate(updated)
    return updated
  }

  const handleProfileSave = async (values: { displayName: string; avatarUrl?: string }) => {
    setLoading('saveProfile', true); setResult('saveProfile', null)
    const result = await api.adminUpdateUser(localUser.id, { display_name: values.displayName, avatar_url: values.avatarUrl })
    setLoading('saveProfile', false)
    if (api.isError(result)) { setResult('saveProfile', 'error'); clearResult('saveProfile', 2000); return }
    patch({ displayName: values.displayName, avatarUrl: values.avatarUrl ?? null })
    setResult('saveProfile', 'success'); clearResult('saveProfile', 2000)
  }

  const handleVerifyEmail = async () => {
    setLoading('verifyEmail', true); setResult('verifyEmail', null)
    const result = await api.verifyUser(localUser.id)
    setLoading('verifyEmail', false)
    if (api.isError(result)) { setResult('verifyEmail', 'error'); clearResult('verifyEmail', 2000); return }
    patch({ emailConfirmed: true })
    setResult('verifyEmail', 'success'); clearResult('verifyEmail', 2000)
  }

  const handleRevokeVerification = async () => {
    setLoading('revokeVerification', true); setResult('revokeVerification', null)
    const result = await api.unverifyUser(localUser.id)
    setLoading('revokeVerification', false)
    if (api.isError(result)) { setResult('revokeVerification', 'error'); clearResult('revokeVerification', 2000); return }
    patch({ emailConfirmed: false })
    setResult('revokeVerification', 'success'); clearResult('revokeVerification', 2000)
  }

  const handleSendMagicLink = async () => {
    setLoading('sendMagicLink', true); setResult('sendMagicLink', null)
    const result = await api.sendMagicLink(localUser.id, `${window.location.origin}/magic-link`)
    setLoading('sendMagicLink', false)
    if (api.isError(result)) { setResult('sendMagicLink', 'error'); clearResult('sendMagicLink', 2000); return }
    setMagicLinkSent(true)
    setResult('sendMagicLink', 'success')
    setTimeout(() => { setMagicLinkSent(false); setResult('sendMagicLink', null) }, 3000)
  }

  const handleToggleStatus = async () => {
    setLoading('toggleStatus', true); setResult('toggleStatus', null)
    const isSuspended = localUser.status === 'suspended'
    const result = await (isSuspended ? api.unsuspendUser(localUser.id) : api.suspendUser(localUser.id))
    setLoading('toggleStatus', false)
    if (api.isError(result)) { setResult('toggleStatus', 'error'); clearResult('toggleStatus', 2000); return }
    patch({ status: isSuspended ? 'active' : 'suspended' })
    setResult('toggleStatus', 'success'); clearResult('toggleStatus', 2000)
  }

  const handleSetPassword = async (values: { password: string }) => {
    setLoading('setPassword', true); setResult('setPassword', null)
    const result = await api.adminResetPassword(localUser.id, values.password)
    setLoading('setPassword', false)
    if (api.isError(result)) { setResult('setPassword', 'error'); clearResult('setPassword', 2000); return }
    passwordForm.resetFields()
    setResult('setPassword', 'success'); clearResult('setPassword', 2000)
  }

  const handlePermissionToggle = async (permKey: string, checked: boolean) => {
    setPermissionLoading(prev => ({ ...prev, [permKey]: true }))
    setPermissionResults(prev => ({ ...prev, [permKey]: null }))

    const newPermissions = checked
      ? [...localUser.permissions, permKey]
      : localUser.permissions.filter(p => p !== permKey)

    const result = await api.updateUserPermissions(localUser.id, newPermissions)

    setPermissionLoading(prev => ({ ...prev, [permKey]: false }))
    if (api.isError(result)) {
      setPermissionResults(prev => ({ ...prev, [permKey]: 'error' }))
      setTimeout(() => setPermissionResults(prev => ({ ...prev, [permKey]: null })), 2000)
      return
    }

    patch({ permissions: newPermissions })
    setPermissionResults(prev => ({ ...prev, [permKey]: 'success' }))
    setTimeout(() => setPermissionResults(prev => ({ ...prev, [permKey]: null })), 1500)
  }

  const handleDelete = async () => {
    setLoading('deleteAccount', true)
    const result = await api.deleteAdminUser(localUser.id)
    setLoading('deleteAccount', false)
    if (api.isError(result)) return
    onDelete(localUser.id)
  }

  const displayName = localUser.displayName ?? localUser.email ?? '?'
  const initials = displayName.charAt(0).toUpperCase()

  const SectionDivider = () => (
    <div style={{ height: 1, background: 'rgba(42, 45, 48, 0.6)', margin: '0 -32px 24px' }} />
  )

  return (
    <Modal
      open={true}
      onCancel={onClose}
      footer={null}
      width={640}
      centered
      closeIcon={null}
      style={{ padding: 0 }}
      styles={{
        container: {
          background: 'rgba(17, 19, 20, 0.98)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          borderRadius: '16px',
          padding: 0,
          overflow: 'hidden',
        },
        body: {
          padding: 0,
          margin: 0,
          maxHeight: '85vh',
          overflowY: 'auto',
        },
        mask: {
          backdropFilter: 'blur(3px)',
          background: 'rgba(0, 0, 0, 0.4)',
        },
      }}
    >
      {/* Sticky header */}
      <div style={{
        padding: '28px 32px',
        background: 'linear-gradient(135deg, rgba(17, 19, 20, 0.98), rgba(28, 31, 33, 0.95))',
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}>
        <Flex align="center" gap={16}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0, color: '#F1F5F9', fontSize: '19px', fontWeight: 700, letterSpacing: '-0.3px', marginBottom: '3px' }}>
              {displayName}
            </Title>
            {localUser.displayName && <Text style={{ color: '#94A3B8', fontSize: '14px' }}>{localUser.email}</Text>}
          </div>
          <Tag style={{
            background: localUser.status === 'active' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: localUser.status === 'active' ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
            color: localUser.status === 'active' ? '#4ADE80' : '#EF4444',
            padding: '5px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, margin: 0,
          }}>
            {localUser.status}
          </Tag>
          <Button
            icon={<CloseOutlined />}
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid rgba(148, 163, 184, 0.2)',
              color: '#94A3B8', borderRadius: '8px', height: '32px', width: '32px',
              padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          />
        </Flex>
      </div>

      {/* Scrollable body */}
      <div style={{ padding: '28px 32px' }}>

        {/* User Profile */}
        <div style={{ marginBottom: '28px' }}>
          <Text style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B', display: 'block', marginBottom: '16px' }}>
            User Profile
          </Text>
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleProfileSave}
            requiredMark={false}
            initialValues={{ displayName: localUser.displayName ?? '', avatarUrl: localUser.avatarUrl ?? '' }}
          >
            <Form.Item name="displayName" label={<span style={{ color: '#F1F5F9', fontSize: '13px', fontWeight: 500 }}>Display Name</span>} style={{ marginBottom: '16px' }}>
              <Input placeholder={localUser.email?.split('@')[0]} style={{ background: 'rgba(28, 31, 33, 0.6)', border: '1px solid #2A2D30', borderRadius: '10px', color: '#F1F5F9' }} />
            </Form.Item>
            <Flex justify="flex-end" style={{ marginTop: '-8px' }}>
              <Button
                htmlType="submit"
                loading={loadingStates.saveProfile}
                size="small"
                style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38BDF8', borderRadius: '8px', fontWeight: 600, fontSize: '13px' }}
              >
                {actionResults.saveProfile === 'success' ? <><CheckCircleOutlined style={{ color: '#4ADE80' }} /> Saved</> : 'Save Profile'}
              </Button>
            </Flex>
          </Form>
        </div>

        <SectionDivider />

        {/* Authentication */}
        <div style={{ marginBottom: '28px' }}>
          <Text style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B', display: 'block', marginBottom: '16px' }}>
            Authentication
          </Text>

          {/* Email verification */}
          <div style={{ padding: '16px', background: 'rgba(28, 31, 33, 0.4)', borderRadius: '12px', border: '1px solid rgba(42, 45, 48, 0.6)', marginBottom: '12px' }}>
            <Flex justify="space-between" align="center">
              <div>
                <Text style={{ color: '#F1F5F9', fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Email Verification</Text>
                <Flex align="center" gap={6}>
                  {localUser.emailConfirmed ? (
                    <><CheckCircleOutlined style={{ color: '#4ADE80', fontSize: '13px' }} /><Text style={{ color: '#4ADE80', fontSize: '13px' }}>Verified</Text></>
                  ) : (
                    <><CloseCircleOutlined style={{ color: '#F59E0B', fontSize: '13px' }} /><Text style={{ color: '#F59E0B', fontSize: '13px' }}>Unverified</Text></>
                  )}
                </Flex>
              </div>
              <Flex gap={8}>
                {!localUser.emailConfirmed ? (
                  <Button
                    size="small"
                    loading={loadingStates.verifyEmail}
                    onClick={handleVerifyEmail}
                    style={{ background: 'rgba(74, 222, 128, 0.15)', border: '1px solid rgba(74, 222, 128, 0.3)', color: '#4ADE80', borderRadius: '8px', fontWeight: 600, fontSize: '12px' }}
                  >
                    {actionResults.verifyEmail === 'success' ? <CheckCircleOutlined /> : 'Verify'}
                  </Button>
                ) : (
                  <Button
                    size="small"
                    loading={loadingStates.revokeVerification}
                    onClick={handleRevokeVerification}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', borderRadius: '8px', fontWeight: 600, fontSize: '12px' }}
                  >
                    {actionResults.revokeVerification === 'success' ? <CheckCircleOutlined /> : 'Revoke'}
                  </Button>
                )}
              </Flex>
            </Flex>
          </div>

          {/* Magic link */}
          <div style={{ padding: '16px', background: 'rgba(28, 31, 33, 0.4)', borderRadius: '12px', border: '1px solid rgba(42, 45, 48, 0.6)' }}>
            <Flex justify="space-between" align="center">
              <div>
                <Text style={{ color: '#F1F5F9', fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  <MailOutlined style={{ marginRight: '8px', color: '#38BDF8' }} />
                  Magic Link Sign-in
                </Text>
                <Text style={{ color: '#64748B', fontSize: '12px' }}>Send a passwordless sign-in link</Text>
              </div>
              <Button
                size="small"
                loading={loadingStates.sendMagicLink}
                onClick={handleSendMagicLink}
                style={{
                  background: magicLinkSent ? 'rgba(74, 222, 128, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  border: magicLinkSent ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                  color: magicLinkSent ? '#4ADE80' : '#38BDF8',
                  borderRadius: '8px', fontWeight: 600, fontSize: '12px',
                }}
              >
                {magicLinkSent ? <><CheckCircleOutlined /> Sent!</> : 'Send Link'}
              </Button>
            </Flex>
          </div>
        </div>

        <SectionDivider />

        {/* Security & Access */}
        <div style={{ marginBottom: '28px' }}>
          <Text style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B', display: 'block', marginBottom: '16px' }}>
            Security & Access
          </Text>

          {/* Reset password */}
          <div style={{ padding: '16px', background: 'rgba(28, 31, 33, 0.4)', borderRadius: '12px', border: '1px solid rgba(42, 45, 48, 0.6)', marginBottom: '12px' }}>
            <Text style={{ color: '#F1F5F9', fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '12px' }}>
              <LockOutlined style={{ marginRight: '8px', color: '#38BDF8' }} />
              Reset Password
            </Text>
            <Form form={passwordForm} layout="vertical" onFinish={handleSetPassword} requiredMark={false}>
              <Form.Item name="password" rules={[{ required: true, min: 6, message: 'Min 6 characters' }]} style={{ marginBottom: '12px' }}>
                <Input.Password
                  placeholder="New password (min. 6 characters)"
                  style={{ background: 'rgba(17, 19, 20, 0.6)', border: '1px solid #2A2D30', borderRadius: '10px', color: '#F1F5F9' }}
                />
              </Form.Item>
              <Flex justify="flex-end">
                <Button
                  htmlType="submit"
                  size="small"
                  loading={loadingStates.setPassword}
                  style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38BDF8', borderRadius: '8px', fontWeight: 600, fontSize: '13px' }}
                >
                  {actionResults.setPassword === 'success' ? <><CheckCircleOutlined style={{ color: '#4ADE80' }} /> Updated</> : 'Set Password'}
                </Button>
              </Flex>
            </Form>
          </div>

          {/* Account status */}
          <div style={{ padding: '16px', background: 'rgba(28, 31, 33, 0.4)', borderRadius: '12px', border: '1px solid rgba(42, 45, 48, 0.6)' }}>
            <Flex justify="space-between" align="center">
              <div>
                <Text style={{ color: '#F1F5F9', fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Account Status</Text>
                <Text style={{ color: '#64748B', fontSize: '12px' }}>
                  {localUser.status === 'active' ? 'Account is active and can sign in' : 'Account is suspended — sign-in blocked'}
                </Text>
              </div>
              <Flex align="center" gap={8}>
                {actionResults.toggleStatus === 'success' && <CheckCircleOutlined style={{ color: '#4ADE80', fontSize: '13px' }} />}
                {actionResults.toggleStatus === 'error' && <CloseCircleFilled style={{ color: '#EF4444', fontSize: '13px' }} />}
                <Switch
                  checked={localUser.status === 'active'}
                  loading={loadingStates.toggleStatus}
                  onChange={handleToggleStatus}
                  checkedChildren="Active"
                  unCheckedChildren="Suspended"
                  style={{ minWidth: '90px' }}
                />
              </Flex>
            </Flex>
          </div>
        </div>

        <SectionDivider />

        {/* Permissions */}
        <div style={{ marginBottom: '28px' }}>
          <Text style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B', display: 'block', marginBottom: '16px' }}>
            Permissions
          </Text>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {PERMISSION_META.map(perm => (
              <Flex key={perm.key} justify="space-between" align="center">
                <div style={{ flex: 1, marginRight: '16px' }}>
                  <Flex align="center" gap={8}>
                    <Text style={{ color: '#F1F5F9', fontSize: '13px', fontWeight: 600 }}>{perm.name}</Text>
                    {permissionLoading[perm.key] && <LoadingOutlined style={{ color: '#38BDF8', fontSize: '12px' }} />}
                    {permissionResults[perm.key] === 'success' && <CheckCircleOutlined style={{ color: '#4ADE80', fontSize: '12px' }} />}
                    {permissionResults[perm.key] === 'error' && <CloseCircleFilled style={{ color: '#EF4444', fontSize: '12px' }} />}
                  </Flex>
                  <Text style={{ color: '#64748B', fontSize: '11px' }}>{perm.description}</Text>
                </div>
                <Switch
                  checked={localUser.permissions.includes(perm.key)}
                  loading={permissionLoading[perm.key]}
                  onChange={(checked) => handlePermissionToggle(perm.key, checked)}
                  style={{ minWidth: '44px' }}
                />
              </Flex>
            ))}
          </Space>
        </div>

        <SectionDivider />

        {/* Danger Zone */}
        <div style={{ marginBottom: '8px' }}>
          <Text style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f87171', display: 'block', marginBottom: '16px' }}>
            Danger Zone
          </Text>
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <Flex justify="space-between" align="center">
              <div>
                <Text style={{ color: '#F1F5F9', fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Delete Account</Text>
                <Text style={{ color: '#64748B', fontSize: '12px' }}>Permanently remove this user and all their data</Text>
              </div>
              {!showDeleteConfirm ? (
                <Button
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', borderRadius: '8px', fontWeight: 600, fontSize: '12px' }}
                >
                  Delete
                </Button>
              ) : (
                <Flex gap={8}>
                  <Button
                    size="small"
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{ background: 'transparent', border: '1px solid #2A2D30', color: '#64748B', borderRadius: '8px', fontSize: '12px' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    danger
                    loading={loadingStates.deleteAccount}
                    onClick={handleDelete}
                    style={{ borderRadius: '8px', fontWeight: 600, fontSize: '12px' }}
                  >
                    Confirm Delete
                  </Button>
                </Flex>
              )}
            </Flex>
          </div>
        </div>
      </div>
    </Modal>
  )
}
