import { useState } from 'react';
import { Modal, Tag, Button, Space, Form, Input, Switch, Typography, Flex } from 'antd';
import { MailOutlined, LockOutlined, UserAddOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { User } from './UserManagement';

const { Title, Text } = Typography;

interface CreateUserModalProps {
  onClose: () => void;
  onCreate: (user: Omit<User, 'id' | 'joinedDate'>) => void;
}

export function CreateUserModal({ onClose, onCreate }: CreateUserModalProps) {
  const [form] = Form.useForm();
  const [emailVerified, setEmailVerified] = useState(false);
  const [status, setStatus] = useState<'active' | 'suspended'>('active');
  const [permissions, setPermissions] = useState<string[]>([]);

  const allPermissions = [
    { key: 'listusers', name: 'View users', description: 'Can access the user management page' },
    { key: 'add', name: 'Create users', description: 'Can create new accounts' },
    { key: 'suspend', name: 'Suspend users', description: 'Can suspend and unsuspend accounts' },
    { key: 'resetpasswords', name: 'Reset passwords', description: 'Can reset passwords for other users' },
    { key: 'delete', name: 'Delete users', description: 'Can permanently delete accounts' },
    { key: 'editpermissions', name: 'Edit permissions', description: 'Can grant or revoke permissions for other users' },
    { key: 'selfmanage', name: 'Full self-management', description: 'Can manage all aspects of their own account' },
  ];

  const handlePermissionToggle = (permKey: string, checked: boolean) => {
    setPermissions(checked 
      ? [...permissions, permKey]
      : permissions.filter(p => p !== permKey)
    );
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const newUser: Omit<User, 'id' | 'joinedDate'> = {
        displayName: values.displayName || values.email.split('@')[0],
        email: values.email,
        emailVerified,
        status,
        permissions,
        avatarUrl: values.avatarUrl,
      };
      onCreate(newUser);
    });
  };

  return (
    <Modal
      open={true}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
      styles={{
        content: {
          background: 'rgba(28, 31, 33, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '16px',
          padding: 0,
          overflow: 'hidden'
        },
        body: {
          padding: 0,
          maxHeight: '80vh',
          overflowY: 'auto'
        }
      }}
    >
      {/* Header */}
      <div style={{ 
        padding: '20px 24px',
        background: 'rgba(17, 19, 20, 0.6)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.1)',
      }}>
        <Title level={4} style={{ 
          margin: 0, 
          color: '#F1F5F9', 
          fontSize: '18px',
          fontWeight: 700,
        }}>
          Create New User
        </Title>
        <Text style={{ color: '#64748B', fontSize: '13px' }}>
          Set up account details and permissions
        </Text>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        
        {/* Basic Info */}
        <SectionCard title="Basic Information">
          <Form form={form} layout="vertical">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Form.Item 
                name="email" 
                label={<span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500 }}>Email Address</span>}
                rules={[
                  { required: true, message: 'Email required' },
                  { type: 'email', message: 'Invalid email' }
                ]}
                style={{ marginBottom: 0 }}
              >
                <Input 
                  prefix={<MailOutlined style={{ color: '#64748B', fontSize: '12px' }} />}
                  placeholder="user@example.com"
                  style={{
                    background: 'rgba(17, 19, 20, 0.8)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    borderRadius: '8px',
                    color: '#F1F5F9',
                    height: '36px',
                    fontSize: '14px'
                  }}
                />
              </Form.Item>
              
              <Form.Item 
                name="password" 
                label={<span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500 }}>Temporary Password</span>}
                rules={[{ required: true, message: 'Password required' }]}
                style={{ marginBottom: 0 }}
              >
                <Input.Password 
                  prefix={<LockOutlined style={{ color: '#64748B', fontSize: '12px' }} />}
                  placeholder="••••••••"
                  style={{
                    background: 'rgba(17, 19, 20, 0.8)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    borderRadius: '8px',
                    color: '#F1F5F9',
                    height: '36px',
                    fontSize: '14px'
                  }}
                />
              </Form.Item>

              <Flex gap={12}>
                <Form.Item 
                  name="displayName" 
                  label={<span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500 }}>Display Name (Optional)</span>}
                  style={{ flex: 1, marginBottom: 0 }}
                >
                  <Input 
                    placeholder="Full name"
                    style={{
                      background: 'rgba(17, 19, 20, 0.8)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      borderRadius: '8px',
                      color: '#F1F5F9',
                      height: '36px',
                      fontSize: '14px'
                    }}
                  />
                </Form.Item>
                <Form.Item 
                  name="avatarUrl" 
                  label={<span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500 }}>Avatar URL (Optional)</span>}
                  style={{ flex: 1, marginBottom: 0 }}
                >
                  <Input 
                    placeholder="https://..."
                    style={{
                      background: 'rgba(17, 19, 20, 0.8)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      borderRadius: '8px',
                      color: '#F1F5F9',
                      height: '36px',
                      fontSize: '14px'
                    }}
                  />
                </Form.Item>
              </Flex>
            </Space>
          </Form>
        </SectionCard>

        {/* Account Settings */}
        <SectionCard title="Account Settings">
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {/* Email Verification */}
            <Flex justify="space-between" align="center" style={{
              padding: '12px',
              background: 'rgba(17, 19, 20, 0.6)',
              border: '1px solid rgba(56, 189, 248, 0.1)',
              borderRadius: '8px',
            }}>
              <div>
                <Text style={{ color: '#F1F5F9', display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
                  Email Verification
                </Text>
                <Tag 
                  style={{
                    background: emailVerified 
                      ? 'rgba(74, 222, 128, 0.15)' 
                      : 'rgba(251, 191, 36, 0.15)',
                    border: emailVerified 
                      ? '1px solid rgba(74, 222, 128, 0.3)' 
                      : '1px solid rgba(251, 191, 36, 0.3)',
                    color: emailVerified ? '#4ADE80' : '#FCD34D',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    margin: 0,
                    fontSize: '11px'
                  }}
                >
                  {emailVerified ? 'Verified' : 'Unverified'}
                </Tag>
              </div>
              <Switch 
                size="small"
                checked={emailVerified}
                onChange={setEmailVerified}
              />
            </Flex>

            {/* Account Status */}
            <Flex justify="space-between" align="center" style={{
              padding: '12px',
              background: 'rgba(17, 19, 20, 0.6)',
              border: '1px solid rgba(56, 189, 248, 0.1)',
              borderRadius: '8px',
            }}>
              <div>
                <Text style={{ color: '#F1F5F9', display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
                  Account Status
                </Text>
                <Tag 
                  style={{
                    background: status === 'active' 
                      ? 'rgba(74, 222, 128, 0.15)' 
                      : 'rgba(239, 68, 68, 0.15)',
                    border: status === 'active' 
                      ? '1px solid rgba(74, 222, 128, 0.3)' 
                      : '1px solid rgba(239, 68, 68, 0.3)',
                    color: status === 'active' ? '#4ADE80' : '#EF4444',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    margin: 0,
                    fontSize: '11px'
                  }}
                >
                  {status}
                </Tag>
              </div>
              <Switch 
                size="small"
                checked={status === 'active'}
                onChange={(checked) => setStatus(checked ? 'active' : 'suspended')}
              />
            </Flex>
          </Space>
        </SectionCard>

        {/* Permissions */}
        <SectionCard title="Permissions">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {allPermissions.map(perm => (
              <Flex key={perm.key} justify="space-between" align="center" style={{
                padding: '10px 12px',
                background: 'rgba(17, 19, 20, 0.6)',
                border: permissions.includes(perm.key)
                  ? '1px solid rgba(56, 189, 248, 0.2)'
                  : '1px solid rgba(56, 189, 248, 0.1)',
                borderRadius: '8px',
              }}>
                <div style={{ flex: 1, marginRight: '12px' }}>
                  <Text style={{ color: '#F1F5F9', display: 'block', marginBottom: '1px', fontWeight: 500, fontSize: '13px' }}>
                    {perm.name}
                  </Text>
                  <Text style={{ color: '#64748B', fontSize: '12px' }}>
                    {perm.description}
                  </Text>
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
      </div>

      {/* Footer */}
      <div style={{ 
        padding: '16px 24px',
        background: 'rgba(17, 19, 20, 0.6)',
        borderTop: '1px solid rgba(56, 189, 248, 0.1)',
      }}>
        <Flex gap={12} justify="flex-end">
          <Button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '8px',
              height: '38px',
              padding: '0 20px',
              color: '#94A3B8',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
          >
            Cancel
          </Button>
          <Button 
            type="primary"
            onClick={handleSubmit}
            style={{
              background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
              border: 'none',
              borderRadius: '8px',
              height: '38px',
              padding: '0 24px',
              fontWeight: 700,
              color: '#FFFFFF',
              fontSize: '13px',
              boxShadow: '0 4px 16px rgba(56, 189, 248, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            Create User
          </Button>
        </Flex>
      </div>
    </Modal>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <Title level={5} style={{ 
        color: '#F1F5F9', 
        margin: 0, 
        marginBottom: '12px', 
        fontSize: '14px', 
        fontWeight: 600,
      }}>
        {title}
      </Title>
      {children}
    </div>
  );
}