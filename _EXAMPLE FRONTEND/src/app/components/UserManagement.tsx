import { useState, useEffect } from 'react';
import { Layout, Typography, Button, Tag, Space, Card, Flex, Modal, Skeleton } from 'antd';
import { PlusOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { UserManagementPanel } from './UserManagementPanel';
import { CreateUserModal } from './CreateUserModal';

const { Content } = Layout;
const { Title, Text } = Typography;

export interface User {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  status: 'active' | 'suspended';
  permissions: string[];
  joinedDate: string;
  avatarUrl?: string;
}

export function UserManagement() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Mock user data
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      displayName: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      emailVerified: true,
      status: 'active',
      permissions: ['listusers', 'add', 'suspend'],
      joinedDate: '2026-01-15',
    },
    {
      id: '2',
      displayName: 'Mike Chen',
      email: 'mike.chen@example.com',
      emailVerified: false,
      status: 'active',
      permissions: ['listusers'],
      joinedDate: '2026-02-20',
    },
    {
      id: '3',
      displayName: 'Emma Rodriguez',
      email: 'emma.r@example.com',
      emailVerified: true,
      status: 'suspended',
      permissions: [],
      joinedDate: '2025-12-10',
    },
    {
      id: '4',
      displayName: 'Alex Taylor',
      email: 'alex.taylor@example.com',
      emailVerified: true,
      status: 'active',
      permissions: ['listusers', 'add', 'suspend', 'resetpasswords', 'delete', 'editpermissions'],
      joinedDate: '2026-01-05',
    },
    {
      id: '5',
      displayName: 'Jordan Kim',
      email: 'jordan.kim@example.com',
      emailVerified: true,
      status: 'active',
      permissions: ['listusers', 'add'],
      joinedDate: '2026-03-01',
    },
  ]);

  const handleCreateUser = (newUser: Omit<User, 'id' | 'joinedDate'>) => {
    const user: User = {
      ...newUser,
      id: String(users.length + 1),
      joinedDate: new Date().toISOString().split('T')[0],
    };
    setUsers([...users, user]);
    setShowCreateModal(false);
  };

  useEffect(() => {
    // Simulate loading user data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Content style={{ 
      padding: '88px 24px 100px',
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: '24px' }}>
        <Title 
          level={1} 
          style={{ 
            color: '#F1F5F9', 
            margin: 0,
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.5px'
          }}
        >
          User Management
        </Title>
        <Button 
          icon={<PlusOutlined />}
          onClick={() => setShowCreateModal(true)}
          style={{
            background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
            border: 'none',
            borderRadius: '10px',
            height: '40px',
            padding: '0 20px',
            fontSize: '14px',
            fontWeight: 700,
            color: '#FFFFFF',
            boxShadow: '0 4px 16px rgba(56, 189, 248, 0.25)',
            transition: 'all 0.2s ease'
          }}
        >
          Add User
        </Button>
      </Flex>

      {/* User Table Card */}
      <Card
        style={{
          background: 'rgba(28, 31, 33, 0.4)',
          border: '1px solid rgba(56, 189, 248, 0.1)',
          borderRadius: '16px',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden'
        }}
        styles={{ body: { padding: 0 } }}
      >
        {/* Table Header */}
        <div style={{ 
          padding: '16px 20px',
          borderBottom: '1px solid rgba(56, 189, 248, 0.1)',
          background: 'rgba(17, 19, 20, 0.4)'
        }}>
          <Flex>
            <div style={{ flex: '1 1 35%', paddingRight: '16px' }}>
              <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                User
              </Text>
            </div>
            <div style={{ width: '110px', paddingRight: '16px' }}>
              <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Status
              </Text>
            </div>
            <div style={{ flex: '1 1 25%', paddingRight: '16px' }}>
              <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Permissions
              </Text>
            </div>
            <div style={{ width: '110px', paddingRight: '16px' }}>
              <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Joined
              </Text>
            </div>
            <div style={{ width: '100px' }}></div>
          </Flex>
        </div>

        {/* Table Rows */}
        {isLoading ? (
          // Loading skeleton rows
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              style={{
                padding: '16px 20px',
                borderBottom: index < 4 ? '1px solid rgba(56, 189, 248, 0.05)' : 'none',
              }}
            >
              <Flex align="center">
                {/* User Info */}
                <Flex align="center" gap={12} style={{ flex: '1 1 35%', paddingRight: '16px', minWidth: 0 }}>
                  <Skeleton.Avatar 
                    active 
                    size={40} 
                    style={{ 
                      borderRadius: '12px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      flexShrink: 0
                    }} 
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Skeleton.Input
                      active
                      size="small"
                      style={{
                        width: '70%',
                        marginBottom: '6px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        borderRadius: '6px',
                        height: '16px'
                      }}
                    />
                    <Skeleton.Input
                      active
                      size="small"
                      style={{
                        width: '85%',
                        background: 'rgba(56, 189, 248, 0.08)',
                        borderRadius: '6px',
                        height: '14px'
                      }}
                    />
                  </div>
                </Flex>

                {/* Status */}
                <div style={{ width: '110px', paddingRight: '16px' }}>
                  <Skeleton.Button
                    active
                    size="small"
                    style={{
                      width: '70px',
                      height: '24px',
                      borderRadius: '6px',
                      background: 'rgba(56, 189, 248, 0.1)'
                    }}
                  />
                </div>

                {/* Permissions */}
                <div style={{ flex: '1 1 25%', paddingRight: '16px' }}>
                  <Skeleton.Input
                    active
                    size="small"
                    style={{
                      width: '90px',
                      height: '14px',
                      background: 'rgba(56, 189, 248, 0.08)',
                      borderRadius: '6px'
                    }}
                  />
                </div>

                {/* Joined Date */}
                <div style={{ width: '110px', paddingRight: '16px' }}>
                  <Skeleton.Input
                    active
                    size="small"
                    style={{
                      width: '80px',
                      height: '14px',
                      background: 'rgba(56, 189, 248, 0.08)',
                      borderRadius: '6px'
                    }}
                  />
                </div>

                {/* Manage Button */}
                <div style={{ width: '100px' }}>
                  <Skeleton.Button
                    active
                    size="small"
                    style={{
                      width: '75px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.1)'
                    }}
                  />
                </div>
              </Flex>
            </div>
          ))
        ) : (
          users.map((user, index) => (
            <div
              key={user.id}
              style={{
                padding: '16px 20px',
                borderBottom: index < users.length - 1 ? '1px solid rgba(56, 189, 248, 0.05)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              onClick={() => setSelectedUser(user)}
            >
              <Flex align="center">
                {/* User Info */}
                <Flex align="center" gap={12} style={{ flex: '1 1 35%', paddingRight: '16px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      flexShrink: 0
                    }}
                  >
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text 
                      style={{ 
                        color: '#F1F5F9', 
                        fontSize: '14px', 
                        fontWeight: 600, 
                        display: 'block',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {user.displayName}
                    </Text>
                    {!user.emailVerified ? (
                      <Tag 
                        icon={<CloseCircleOutlined />}
                        style={{ 
                          fontSize: '12px',
                          background: 'rgba(251, 191, 36, 0.15)',
                          border: '1px solid rgba(251, 191, 36, 0.3)',
                          color: '#FCD34D',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          margin: 0,
                          lineHeight: '18px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {user.email}
                      </Tag>
                    ) : (
                      <Text 
                        style={{ 
                          color: '#64748B', 
                          fontSize: '13px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block'
                        }}
                      >
                        {user.email}
                      </Text>
                    )}
                  </div>
                </Flex>

                {/* Status */}
                <div style={{ width: '110px', paddingRight: '16px' }}>
                  <Tag 
                    style={{
                      background: user.status === 'active' 
                        ? 'rgba(74, 222, 128, 0.15)' 
                        : 'rgba(239, 68, 68, 0.15)',
                      border: user.status === 'active' 
                        ? '1px solid rgba(74, 222, 128, 0.3)' 
                        : '1px solid rgba(239, 68, 68, 0.3)',
                      color: user.status === 'active' ? '#4ADE80' : '#EF4444',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      margin: 0
                    }}
                  >
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

                {/* Joined Date */}
                <div style={{ width: '110px', paddingRight: '16px' }}>
                  <Text style={{ color: '#94A3B8', fontSize: '13px' }}>
                    {new Date(user.joinedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </div>

                {/* Manage Button */}
                <div style={{ width: '100px' }}>
                  <Button 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUser(user);
                    }}
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38BDF8',
                      borderRadius: '8px',
                      height: '32px',
                      padding: '0 14px',
                      fontWeight: 600,
                      fontSize: '13px'
                    }}
                  >
                    Manage
                  </Button>
                </div>
              </Flex>
            </div>
          ))
        )}
      </Card>

      {/* User Management Modal */}
      {selectedUser && (
        <UserManagementPanel 
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={(updatedUser) => {
            setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
            // Keep modal open for continued editing - don't close on update
            setSelectedUser(updatedUser); // Update the selected user with new data
          }}
          onDelete={(userId) => {
            setUsers(users.filter(u => u.id !== userId));
            setSelectedUser(null);
          }}
        />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateUser}
        />
      )}
    </Content>
  );
}