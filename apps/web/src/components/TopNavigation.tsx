import { Badge, Dropdown, Flex } from 'antd'
import { BellOutlined, UserOutlined, LogoutOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { MenuProps } from 'antd'
import { UserAvatar } from './UserAvatar'
import { BrandLogo } from './BrandLogo'

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
    <nav className="sl-top-nav">
      <div className="sl-content-inner">
        <Flex justify="space-between" align="center">
          <BrandLogo
            height={26}
            responsive
            onClick={() => navigate('/')}
          />

          {/* Right side */}
          <Flex align="center" gap={16}>
            <button type="button" aria-label="Notifications" className="sl-icon-button" style={{ position: 'relative' }}>
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
