import { useState } from 'react';
import { Modal, Tag, Button, Space, Form, Input, Switch, Typography, Flex, Divider } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, MailOutlined, LockOutlined, DeleteOutlined, SaveOutlined, SendOutlined, CloseOutlined, LoadingOutlined, CloseCircleFilled } from '@ant-design/icons';
import type { User } from './UserManagement';

const { Title, Text } = Typography;

interface UserManagementPanelProps {
  user: User;
  onClose: () => void;
  onUpdate: (user: User) => void;
  onDelete: (userId: string) => void;
}

export function UserManagementPanel({ user, onClose, onUpdate, onDelete }: UserManagementPanelProps) {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [localUser, setLocalUser] = useState<User>(user);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  
  // Loading states for each action
  const [loadingStates, setLoadingStates] = useState({
    saveProfile: false,
    verifyEmail: false,
    revokeVerification: false,
    sendMagicLink: false,
    setPassword: false,
    toggleStatus: false,
    deleteAccount: false
  });

  // Success/Error states
  const [actionResults, setActionResults] = useState<{
    [key: string]: 'success' | 'error' | null;
  }>({});

  // Loading states for individual permission toggles
  const [permissionLoading, setPermissionLoading] = useState<{
    [key: string]: boolean;
  }>({});

  // Success/Error states for individual permissions
  const [permissionResults, setPermissionResults] = useState<{
    [key: string]: 'success' | 'error' | null;
  }>({});

  const allPermissions = [
    { key: 'listusers', name: 'View users', description: 'Can access the user management page' },
    { key: 'add', name: 'Create users', description: 'Can create new accounts' },
    { key: 'suspend', name: 'Suspend users', description: 'Can suspend and unsuspend accounts' },
    { key: 'resetpasswords', name: 'Reset passwords', description: 'Can reset passwords for other users' },
    { key: 'delete', name: 'Delete users', description: 'Can permanently delete accounts' },
    { key: 'editpermissions', name: 'Edit permissions', description: 'Can grant or revoke permissions for other users' },
    { key: 'selfmanage', name: 'Full self-management', description: 'Can manage all aspects of their own account' },
  ];

  const handleProfileSave = async () => {
    setLoadingStates(prev => ({ ...prev, saveProfile: true }));
    setActionResults(prev => ({ ...prev, saveProfile: null }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const values = form.getFieldsValue();
      const updated = { ...localUser, ...values };
      setLocalUser(updated);
      onUpdate(updated);
      
      setActionResults(prev => ({ ...prev, saveProfile: 'success' }));
      setTimeout(() => setActionResults(prev => ({ ...prev, saveProfile: null })), 2000);
    } catch (error) {
      setActionResults(prev => ({ ...prev, saveProfile: 'error' }));
      setTimeout(() => setActionResults(prev => ({ ...prev, saveProfile: null })), 2000);
    } finally {
      setLoadingStates(prev => ({ ...prev, saveProfile: false }));
    }
  };

  const handleVerifyEmail = async () => {
    setLoadingStates(prev => ({ ...prev, verifyEmail: true }));
    setActionResults(prev => ({ ...prev, verifyEmail: null }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updated = { ...localUser, emailVerified: true };
      setLocalUser(updated);
      onUpdate(updated);
      
      setActionResults(prev => ({ ...prev, verifyEmail: 'success' }));
      setTimeout(() => setActionResults(prev => ({ ...prev, verifyEmail: null })), 2000);
    } catch (error) {
      setActionResults(prev => ({ ...prev, verifyEmail: 'error' }));
      setTimeout(() => setActionResults(prev => ({ ...prev, verifyEmail: null })), 2000);
    } finally {
      setLoadingStates(prev => ({ ...prev, verifyEmail: false }));
    }
  };

  const handleRevokeVerification = async () => {
    setLoadingStates(prev => ({ ...prev, revokeVerification: true }));
    setActionResults(prev => ({ ...prev, revokeVerification: null }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updated = { ...localUser, emailVerified: false };
      setLocalUser(updated);
      onUpdate(updated);
      
      setActionResults(prev => ({ ...prev, revokeVerification: 'success' }));
      setTimeout(() => setActionResults(prev => ({ ...prev, revokeVerification: null })), 2000);
    } catch (error) {
      setActionResults(prev => ({ ...prev, revokeVerification: 'error' }));
      setTimeout(() => setActionResults(prev => ({ ...prev, revokeVerification: null })), 2000);
    } finally {
      setLoadingStates(prev => ({ ...prev, revokeVerification: false }));
    }
  };

  const handleSendMagicLink = async () => {
    setLoadingStates(prev => ({ ...prev, sendMagicLink: true }));
    setActionResults(prev => ({ ...prev, sendMagicLink: null }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      setEmailLinkSent(true);
      setActionResults(prev => ({ ...prev, sendMagicLink: 'success' }));
      
      setTimeout(() => {
        setEmailLinkSent(false);
        setActionResults(prev => ({ ...prev, sendMagicLink: null }));
      }, 3000);
    } catch (error) {
      setActionResults(prev => ({ ...prev, sendMagicLink: 'error' }));
      setTimeout(() => setActionResults(prev => ({ ...prev, sendMagicLink: null })), 2000);
    } finally {
      setLoadingStates(prev => ({ ...prev, sendMagicLink: false }));
    }
  };

  const handleToggleStatus = async () => {
    setLoadingStates(prev => ({ ...prev, toggleStatus: true }));
    setActionResults(prev => ({ ...prev, toggleStatus: null }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 900));
      
      const updated = { 
        ...localUser, 
        status: localUser.status === 'active' ? 'suspended' : 'active' as 'active' | 'suspended'
      };
      setLocalUser(updated);
      onUpdate(updated);
      
      setActionResults(prev => ({ ...prev, toggleStatus: 'success' }));
      setTimeout(() => setActionResults(prev => ({ ...prev, toggleStatus: null })), 2000);
    } catch (error) {
      setActionResults(prev => ({ ...prev, toggleStatus: 'error' }));
      setTimeout(() => setActionResults(prev => ({ ...prev, toggleStatus: null })), 2000);
    } finally {
      setLoadingStates(prev => ({ ...prev, toggleStatus: false }));
    }
  };

  const handleSetPassword = async (values: any) => {
    setLoadingStates(prev => ({ ...prev, setPassword: true }));
    setActionResults(prev => ({ ...prev, setPassword: null }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Setting password:', values.password);
      passwordForm.resetFields();
      
      setActionResults(prev => ({ ...prev, setPassword: 'success' }));
      setTimeout(() => setActionResults(prev => ({ ...prev, setPassword: null })), 2000);
    } catch (error) {
      setActionResults(prev => ({ ...prev, setPassword: 'error' }));
      setTimeout(() => setActionResults(prev => ({ ...prev, setPassword: null })), 2000);
    } finally {
      setLoadingStates(prev => ({ ...prev, setPassword: false }));
    }
  };

  const handlePermissionToggle = async (permKey: string, checked: boolean) => {
    setPermissionLoading(prev => ({ ...prev, [permKey]: true }));
    setPermissionResults(prev => ({ ...prev, [permKey]: null }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const updated = {
        ...localUser,
        permissions: checked 
          ? [...localUser.permissions, permKey]
          : localUser.permissions.filter(p => p !== permKey)
      };
      setLocalUser(updated);
      onUpdate(updated);
      
      setPermissionResults(prev => ({ ...prev, [permKey]: 'success' }));
      setTimeout(() => setPermissionResults(prev => ({ ...prev, [permKey]: null })), 1500);
    } catch (error) {
      setPermissionResults(prev => ({ ...prev, [permKey]: 'error' }));
      setTimeout(() => setPermissionResults(prev => ({ ...prev, [permKey]: null })), 2000);
    } finally {
      setPermissionLoading(prev => ({ ...prev, [permKey]: false }));
    }
  };

  const handleDelete = async () => {
    setLoadingStates(prev => ({ ...prev, deleteAccount: true }));
    setActionResults(prev => ({ ...prev, deleteAccount: null }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      onDelete(localUser.id);
      
      setActionResults(prev => ({ ...prev, deleteAccount: 'success' }));
    } catch (error) {
      setActionResults(prev => ({ ...prev, deleteAccount: 'error' }));
      setTimeout(() => setActionResults(prev => ({ ...prev, deleteAccount: null })), 2000);
      setLoadingStates(prev => ({ ...prev, deleteAccount: false }));
    }
  };

  return (
    <Modal
      open={true}
      onCancel={onClose}
      footer={null}
      width={640}
      centered
      closeIcon={null}
      styles={{
        content: {
          background: 'rgba(17, 19, 20, 0.98)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          borderRadius: '16px',
          padding: 0,
          overflow: 'hidden'
        },
        body: {
          padding: 0,
          margin: 0,
          maxHeight: '85vh',
          overflowY: 'auto'
        },
        mask: {
          backdropFilter: 'blur(3px)',
          background: 'rgba(0, 0, 0, 0.4)'
        },
        wrapper: {
          backdropFilter: 'blur(3px)'
        }
      }}
      style={{ padding: 0, margin: 0 }}
    >
      {/* Header - Full Width, Sticky */}
      <div style={{ 
        padding: '28px 32px',
        background: 'linear-gradient(135deg, rgba(17, 19, 20, 0.98), rgba(28, 31, 33, 0.95))',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <Flex align="center" gap={16}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 700,
              color: '#FFFFFF',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)'
            }}
          >
            {localUser.displayName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ 
              margin: 0, 
              color: '#F1F5F9', 
              fontSize: '19px',
              fontWeight: 700,
              letterSpacing: '-0.3px',
              marginBottom: '3px'
            }}>
              {localUser.displayName}
            </Title>
            <Text style={{ color: '#94A3B8', fontSize: '14px' }}>{localUser.email}</Text>
          </div>
          <Tag 
            style={{
              background: localUser.status === 'active' 
                ? 'rgba(74, 222, 128, 0.15)' 
                : 'rgba(239, 68, 68, 0.15)',
              border: localUser.status === 'active' 
                ? '1px solid rgba(74, 222, 128, 0.3)' 
                : '1px solid rgba(239, 68, 68, 0.3)',
              color: localUser.status === 'active' ? '#4ADE80' : '#EF4444',
              padding: '5px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              margin: 0
            }}
          >
            {localUser.status}
          </Tag>
          <Button
            icon={<CloseOutlined />}
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              color: '#94A3B8',
              borderRadius: '8px',
              height: '32px',
              width: '32px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          />
        </Flex>
      </div>

      {/* Body - Full Width */}
      <div>
        
        {/* Profile */}
        <div style={{ padding: '28px 32px', borderBottom: '1px solid rgba(56, 189, 248, 0.12)' }}>
          <Text style={{ 
            color: '#F1F5F9', 
            display: 'block',
            marginBottom: '16px', 
            fontSize: '12px', 
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            opacity: 0.7
          }}>
            Profile
          </Text>
          <Form form={form} layout="vertical" initialValues={localUser}>
            <Flex gap={12} align="flex-end">
              <Form.Item 
                name="displayName" 
                label={<span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>Display Name</span>}
                style={{ flex: 1, marginBottom: 0 }}
              >
                <Input 
                  style={{
                    background: 'rgba(17, 19, 20, 0.7)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '10px',
                    color: '#F1F5F9',
                    height: '40px',
                    fontSize: '14px'
                  }}
                />
              </Form.Item>
              <Form.Item 
                name="avatarUrl" 
                label={<span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>Avatar URL</span>}
                style={{ flex: 1, marginBottom: 0 }}
              >
                <Input 
                  placeholder="https://..."
                  style={{
                    background: 'rgba(17, 19, 20, 0.7)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '10px',
                    color: '#F1F5F9',
                    height: '40px',
                    fontSize: '14px'
                  }}
                />
              </Form.Item>
              <Button 
                loading={loadingStates.saveProfile}
                icon={
                  loadingStates.saveProfile ? <LoadingOutlined /> :
                  actionResults.saveProfile === 'success' ? <CheckCircleOutlined /> :
                  actionResults.saveProfile === 'error' ? <CloseCircleFilled /> :
                  <SaveOutlined />
                }
                onClick={handleProfileSave}
                disabled={loadingStates.saveProfile}
                style={{
                  background: actionResults.saveProfile === 'success' ? 'rgba(74, 222, 128, 0.15)' :
                             actionResults.saveProfile === 'error' ? 'rgba(239, 68, 68, 0.15)' :
                             'rgba(56, 189, 248, 0.15)',
                  border: actionResults.saveProfile === 'success' ? '1px solid rgba(74, 222, 128, 0.35)' :
                          actionResults.saveProfile === 'error' ? '1px solid rgba(239, 68, 68, 0.35)' :
                          '1px solid rgba(56, 189, 248, 0.35)',
                  color: actionResults.saveProfile === 'success' ? '#4ADE80' :
                         actionResults.saveProfile === 'error' ? '#EF4444' :
                         '#38BDF8',
                  borderRadius: '10px',
                  height: '40px',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: 0,
                  transition: 'all 0.2s ease'
                }}
              >
                {actionResults.saveProfile === 'success' ? 'Saved!' :
                 actionResults.saveProfile === 'error' ? 'Failed' :
                 'Save'}
              </Button>
            </Flex>
          </Form>
        </div>

        {/* Authentication */}
        <div style={{ padding: '28px 32px', borderBottom: '1px solid rgba(56, 189, 248, 0.12)' }}>
          <Text style={{ 
            color: '#F1F5F9', 
            display: 'block',
            marginBottom: '16px', 
            fontSize: '12px', 
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            opacity: 0.7
          }}>
            Authentication
          </Text>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {/* Email Verification */}
            <Flex justify="space-between" align="center">
              <div>
                <Text style={{ color: '#F1F5F9', display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Email Verification
                </Text>
                <Flex align="center" gap={8}>
                  {localUser.emailVerified ? (
                    <CheckCircleOutlined style={{ color: '#4ADE80', fontSize: '14px' }} />
                  ) : (
                    <CloseCircleOutlined style={{ color: '#FCD34D', fontSize: '14px' }} />
                  )}
                  <Text style={{
                    color: localUser.emailVerified ? '#4ADE80' : '#FCD34D',
                    fontSize: '13px',
                    fontWeight: 500
                  }}>
                    {localUser.emailVerified ? 'Verified' : 'Unverified'}
                  </Text>
                </Flex>
              </div>
              {!localUser.emailVerified ? (
                <Button 
                  size="small"
                  loading={loadingStates.verifyEmail}
                  icon={
                    loadingStates.verifyEmail ? <LoadingOutlined /> :
                    actionResults.verifyEmail === 'success' ? <CheckCircleOutlined /> :
                    actionResults.verifyEmail === 'error' ? <CloseCircleFilled /> :
                    <CheckCircleOutlined />
                  }
                  onClick={handleVerifyEmail}
                  disabled={loadingStates.verifyEmail}
                  style={{
                    background: actionResults.verifyEmail === 'success' ? 'rgba(74, 222, 128, 0.25)' :
                               actionResults.verifyEmail === 'error' ? 'rgba(239, 68, 68, 0.15)' :
                               'rgba(74, 222, 128, 0.15)',
                    border: actionResults.verifyEmail === 'success' ? '1px solid rgba(74, 222, 128, 0.5)' :
                            actionResults.verifyEmail === 'error' ? '1px solid rgba(239, 68, 68, 0.35)' :
                            '1px solid rgba(74, 222, 128, 0.35)',
                    color: actionResults.verifyEmail === 'error' ? '#EF4444' : '#4ADE80',
                    borderRadius: '8px',
                    height: '32px',
                    padding: '0 14px',
                    fontWeight: 600,
                    fontSize: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {actionResults.verifyEmail === 'success' ? 'Done!' :
                   actionResults.verifyEmail === 'error' ? 'Failed' :
                   'Verify'}
                </Button>
              ) : (
                <Button 
                  size="small"
                  loading={loadingStates.revokeVerification}
                  icon={
                    loadingStates.revokeVerification ? <LoadingOutlined /> :
                    actionResults.revokeVerification === 'success' ? <CheckCircleOutlined /> :
                    actionResults.revokeVerification === 'error' ? <CloseCircleFilled /> :
                    <CloseCircleOutlined />
                  }
                  onClick={handleRevokeVerification}
                  disabled={loadingStates.revokeVerification}
                  style={{
                    background: actionResults.revokeVerification === 'success' ? 'rgba(74, 222, 128, 0.15)' :
                               actionResults.revokeVerification === 'error' ? 'rgba(239, 68, 68, 0.25)' :
                               'rgba(239, 68, 68, 0.15)',
                    border: actionResults.revokeVerification === 'success' ? '1px solid rgba(74, 222, 128, 0.35)' :
                            actionResults.revokeVerification === 'error' ? '1px solid rgba(239, 68, 68, 0.5)' :
                            '1px solid rgba(239, 68, 68, 0.35)',
                    color: actionResults.revokeVerification === 'success' ? '#4ADE80' : '#EF4444',
                    borderRadius: '8px',
                    height: '32px',
                    padding: '0 14px',
                    fontWeight: 600,
                    fontSize: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {actionResults.revokeVerification === 'success' ? 'Revoked!' :
                   actionResults.revokeVerification === 'error' ? 'Failed' :
                   'Revoke'}
                </Button>
              )}
            </Flex>

            <Divider style={{ margin: '4px 0', borderColor: 'rgba(56, 189, 248, 0.08)' }} />

            {/* Magic Link */}
            <Flex justify="space-between" align="center">
              <div>
                <Text style={{ color: '#F1F5F9', display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Magic Link Login
                </Text>
                {emailLinkSent ? (
                  <Flex align="center" gap={8}>
                    <CheckCircleOutlined style={{ color: '#4ADE80', fontSize: '14px' }} />
                    <Text style={{ color: '#4ADE80', fontSize: '13px', fontWeight: 500 }}>
                      Sent successfully
                    </Text>
                  </Flex>
                ) : (
                  <Text style={{ color: '#64748B', fontSize: '13px' }}>
                    Send passwordless login link
                  </Text>
                )}
              </div>
              <Button 
                size="small"
                loading={loadingStates.sendMagicLink}
                icon={
                  loadingStates.sendMagicLink ? <LoadingOutlined /> :
                  actionResults.sendMagicLink === 'success' ? <CheckCircleOutlined /> :
                  actionResults.sendMagicLink === 'error' ? <CloseCircleFilled /> :
                  <SendOutlined />
                }
                onClick={handleSendMagicLink}
                disabled={loadingStates.sendMagicLink || emailLinkSent}
                style={{
                  background: actionResults.sendMagicLink === 'success' ? 'rgba(74, 222, 128, 0.15)' :
                             actionResults.sendMagicLink === 'error' ? 'rgba(239, 68, 68, 0.15)' :
                             emailLinkSent ? 'rgba(56, 189, 248, 0.05)' : 'rgba(56, 189, 248, 0.15)',
                  border: actionResults.sendMagicLink === 'success' ? '1px solid rgba(74, 222, 128, 0.35)' :
                          actionResults.sendMagicLink === 'error' ? '1px solid rgba(239, 68, 68, 0.35)' :
                          '1px solid rgba(56, 189, 248, 0.35)',
                  color: actionResults.sendMagicLink === 'success' ? '#4ADE80' :
                         actionResults.sendMagicLink === 'error' ? '#EF4444' :
                         emailLinkSent ? '#64748B' : '#38BDF8',
                  borderRadius: '8px',
                  height: '32px',
                  padding: '0 14px',
                  fontWeight: 600,
                  fontSize: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                {actionResults.sendMagicLink === 'success' ? 'Sent!' :
                 actionResults.sendMagicLink === 'error' ? 'Failed' :
                 'Send'}
              </Button>
            </Flex>
          </Space>
        </div>

        {/* Security & Access - Grouped */}
        <div style={{ padding: '28px 32px', borderBottom: '1px solid rgba(56, 189, 248, 0.12)' }}>
          <Text style={{ 
            color: '#F1F5F9', 
            display: 'block',
            marginBottom: '16px', 
            fontSize: '12px', 
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            opacity: 0.7
          }}>
            Security & Access
          </Text>
          {/* Password Reset */}
          <Form form={passwordForm} onFinish={handleSetPassword}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <Text style={{ color: '#F1F5F9', display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Reset Password
                </Text>
                <Text style={{ color: '#64748B', fontSize: '12px' }}>
                  Set a new password for this user
                </Text>
              </div>
            </Flex>
            <Flex gap={10} align="center" style={{ marginBottom: '20px' }}>
              <Form.Item name="password" style={{ marginBottom: 0, flex: 1 }}>
                <Input.Password 
                  prefix={<LockOutlined style={{ color: '#64748B', fontSize: '13px' }} />}
                  placeholder="New password"
                  style={{
                    background: 'rgba(17, 19, 20, 0.7)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '8px',
                    color: '#F1F5F9',
                    height: '38px',
                    fontSize: '13px'
                  }}
                />
              </Form.Item>
              <Button 
                type="primary"
                htmlType="submit"
                loading={loadingStates.setPassword}
                icon={
                  loadingStates.setPassword ? <LoadingOutlined /> :
                  actionResults.setPassword === 'success' ? <CheckCircleOutlined /> :
                  actionResults.setPassword === 'error' ? <CloseCircleFilled /> :
                  <LockOutlined />
                }
                disabled={loadingStates.setPassword}
                style={{
                  background: actionResults.setPassword === 'success' ? 'rgba(74, 222, 128, 0.15)' :
                             actionResults.setPassword === 'error' ? 'rgba(239, 68, 68, 0.15)' :
                             'rgba(56, 189, 248, 0.15)',
                  border: actionResults.setPassword === 'success' ? '1px solid rgba(74, 222, 128, 0.35)' :
                          actionResults.setPassword === 'error' ? '1px solid rgba(239, 68, 68, 0.35)' :
                          '1px solid rgba(56, 189, 248, 0.35)',
                  color: actionResults.setPassword === 'success' ? '#4ADE80' :
                         actionResults.setPassword === 'error' ? '#EF4444' :
                         '#38BDF8',
                  borderRadius: '8px',
                  height: '38px',
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
              >
                {actionResults.setPassword === 'success' ? 'Done!' :
                 actionResults.setPassword === 'error' ? 'Failed' :
                 'Set'}
              </Button>
            </Flex>
          </Form>

          <Divider style={{ margin: '8px 0 20px', borderColor: 'rgba(56, 189, 248, 0.08)' }} />

          {/* Account Status */}
          <Flex justify="space-between" align="center">
            <div>
              <Text style={{ color: '#F1F5F9', display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                Account Access
              </Text>
              <Text style={{ color: '#64748B', fontSize: '12px' }}>
                {localUser.status === 'active' ? 'User can sign in' : 'Login suspended'}
              </Text>
            </div>
            <Button 
              size="small"
              loading={loadingStates.toggleStatus}
              icon={
                loadingStates.toggleStatus ? <LoadingOutlined /> :
                actionResults.toggleStatus === 'success' ? <CheckCircleOutlined /> :
                actionResults.toggleStatus === 'error' ? <CloseCircleFilled /> :
                undefined
              }
              onClick={handleToggleStatus}
              disabled={loadingStates.toggleStatus}
              style={{
                background: actionResults.toggleStatus === 'success' ? 'rgba(74, 222, 128, 0.15)' :
                           actionResults.toggleStatus === 'error' ? 'rgba(239, 68, 68, 0.15)' :
                           localUser.status === 'active' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                border: actionResults.toggleStatus === 'success' ? '1px solid rgba(74, 222, 128, 0.35)' :
                        actionResults.toggleStatus === 'error' ? '1px solid rgba(239, 68, 68, 0.35)' :
                        localUser.status === 'active' ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(74, 222, 128, 0.35)',
                color: actionResults.toggleStatus === 'success' ? '#4ADE80' :
                       actionResults.toggleStatus === 'error' ? '#EF4444' :
                       localUser.status === 'active' ? '#EF4444' : '#4ADE80',
                borderRadius: '8px',
                height: '32px',
                padding: '0 16px',
                fontWeight: 600,
                fontSize: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              {actionResults.toggleStatus === 'success' ? 'Done!' :
               actionResults.toggleStatus === 'error' ? 'Failed' :
               localUser.status === 'active' ? 'Suspend' : 'Restore'}
            </Button>
          </Flex>
        </div>

        {/* Permissions - Compact Grid */}
        <div style={{ padding: '28px 32px', borderBottom: '1px solid rgba(56, 189, 248, 0.12)' }}>
          <Text style={{ 
            color: '#F1F5F9', 
            display: 'block',
            marginBottom: '16px', 
            fontSize: '12px', 
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            opacity: 0.7
          }}>
            Permissions
          </Text>
          <div style={{
            padding: '20px',
            background: 'rgba(17, 19, 20, 0.5)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '12px'
          }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {allPermissions.map(perm => (
                <Flex key={perm.key} justify="space-between" align="center" style={{
                  padding: '10px 0',
                  borderBottom: perm.key !== 'selfmanage' ? '1px solid rgba(56, 189, 248, 0.08)' : 'none'
                }}>
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <Flex align="center" gap={8}>
                      <Text style={{ color: '#F1F5F9', display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '3px' }}>
                        {perm.name}
                      </Text>
                      {permissionLoading[perm.key] && (
                        <LoadingOutlined style={{ color: '#38BDF8', fontSize: '12px' }} />
                      )}
                      {permissionResults[perm.key] === 'success' && (
                        <CheckCircleOutlined style={{ color: '#4ADE80', fontSize: '12px' }} />
                      )}
                      {permissionResults[perm.key] === 'error' && (
                        <CloseCircleFilled style={{ color: '#EF4444', fontSize: '12px' }} />
                      )}
                    </Flex>
                    <Text style={{ color: '#64748B', fontSize: '11px', lineHeight: '1.4' }}>
                      {perm.description}
                    </Text>
                  </div>
                  <Switch 
                    checked={localUser.permissions.includes(perm.key)}
                    loading={permissionLoading[perm.key]}
                    onChange={(checked) => handlePermissionToggle(perm.key, checked)}
                    style={{
                      minWidth: '44px'
                    }}
                  />
                </Flex>
              ))}
            </Space>
          </div>
        </div>

        {/* Danger Zone */}
        <div style={{ padding: '28px 32px', paddingBottom: '32px' }}>
          <Text style={{ 
            color: '#EF4444', 
            display: 'block', 
            marginBottom: '16px', 
            fontSize: '12px', 
            fontWeight: 700, 
            textTransform: 'uppercase', 
            letterSpacing: '1px',
            opacity: 0.9
          }}>
            Danger Zone
          </Text>
          <div
            style={{
              padding: '20px',
              background: 'rgba(239, 68, 68, 0.08)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '12px'
            }}
          >
            {!showDeleteConfirm ? (
              <Flex justify="space-between" align="center">
                <div>
                  <Text style={{ color: '#F1F5F9', display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
                    Delete Account
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: '12px' }}>
                    Permanently remove this user
                  </Text>
                </div>
                <Button 
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '8px',
                    height: '32px',
                    padding: '0 16px',
                    color: '#EF4444',
                    fontWeight: 600,
                    fontSize: '12px'
                  }}
                >
                  Delete
                </Button>
              </Flex>
            ) : (
              <div>
                <div
                  style={{
                    padding: '14px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    marginBottom: '14px'
                  }}
                >
                  <Text style={{ color: '#F1F5F9', display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px' }}>
                    Permanent Account Deletion
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: '12px' }}>
                    This action is irreversible. All user data, playlists, and account information will be permanently removed.
                  </Text>
                </div>
                <Flex gap={10}>
                  <Button 
                    danger
                    type="primary"
                    loading={loadingStates.deleteAccount}
                    icon={
                      loadingStates.deleteAccount ? <LoadingOutlined /> :
                      actionResults.deleteAccount === 'success' ? <CheckCircleOutlined /> :
                      actionResults.deleteAccount === 'error' ? <CloseCircleFilled /> :
                      <DeleteOutlined />
                    }
                    onClick={handleDelete}
                    disabled={loadingStates.deleteAccount}
                    size="small"
                    style={{
                      background: actionResults.deleteAccount === 'success' ? '#4ADE80' :
                                 actionResults.deleteAccount === 'error' ? '#EF4444' :
                                 '#EF4444',
                      border: 'none',
                      borderRadius: '10px',
                      height: '38px',
                      padding: '0 20px',
                      fontWeight: 700,
                      fontSize: '12px',
                      flex: 1
                    }}
                  >
                    {actionResults.deleteAccount === 'success' ? 'Deleted!' :
                     actionResults.deleteAccount === 'error' ? 'Failed' :
                     'Confirm Deletion'}
                  </Button>
                  <Button 
                    onClick={() => setShowDeleteConfirm(false)}
                    size="small"
                    style={{
                      background: 'rgba(17, 19, 20, 0.6)',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      borderRadius: '10px',
                      height: '38px',
                      padding: '0 20px',
                      color: '#94A3B8',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    Cancel
                  </Button>
                </Flex>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}