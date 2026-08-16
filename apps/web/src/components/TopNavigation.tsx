import { Badge, Dropdown, Flex } from 'antd'
import { BellOutlined, UserOutlined, LogoutOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { Music2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { MenuProps } from 'antd'
import { UserAvatar } from './UserAvatar'

export function TopNavigation() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/signin')
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'email',
      className: 'sl-user-menu-email',
      label: (
        <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: '13px' }}>
          {user?.email}
        </span>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'how-to-use',
      icon: <QuestionCircleOutlined />,
      label: 'How To Use',
      onClick: () => navigate('/how-to-use'),
    },
    { type: 'divider' },
    {
      key: 'signout',
      icon: <LogoutOutlined />,
      label: 'Sign out',
      onClick: handleSignOut,
      danger: true,
    },
  ]

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: '#111314',
      borderBottom: '1px solid #2A2D30',
      padding: '14px 20px',
    }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <Flex justify="space-between" align="center">
          {/* Logo */}
          <Flex
            align="center"
            gap={8}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <div style={{ position: 'relative', width: '24px', height: '24px' }}>
              <Music2 style={{ width: '20px', height: '20px', color: '#38BDF8', position: 'absolute', top: 1, left: 1 }} />
              <Music2 style={{ width: '20px', height: '20px', color: '#38BDF8', position: 'absolute', top: 3, left: 3, opacity: 0.5 }} />
            </div>
            <Flex align="baseline">
              <span style={{ color: 'white', fontWeight: 300, fontSize: '18px', letterSpacing: '-0.3px' }}>Share</span>
              <span style={{ color: '#38BDF8', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>List</span>
            </Flex>
          </Flex>

          {/* Right side */}
          <Flex align="center" gap={16}>
            <button style={{ position: 'relative', padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <BellOutlined style={{ fontSize: '20px', color: '#64748B' }} />
            </button>

            <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
              <div style={{ cursor: 'pointer' }}>
                <Badge
                  dot
                  color="#4ADE80"
                  offset={[-2, 30]}
                  style={{ boxShadow: '0 0 0 2px #111314' }}
                >
                  <UserAvatar
                    src={user?.avatarUrl}
                    name={user?.displayName ?? user?.email}
                    size={34}
                    style={{
                      background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  />
                </Badge>
              </div>
            </Dropdown>
          </Flex>
        </Flex>
      </div>
    </nav>
  )
}
