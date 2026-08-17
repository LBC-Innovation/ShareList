import { Flex } from 'antd'
import { ListMusic, PlusCircle, Users, Settings, ShieldCheck } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function BottomNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const hasAdminAccess = user?.permissions.includes('usermanage:listusers') ?? false

  const isMyListsActive =
    location.pathname === '/' || location.pathname.startsWith('/list')

  const navItems = [
    { icon: ListMusic,  label: 'Lists', path: '/',        active: isMyListsActive },
    { icon: PlusCircle, label: 'Create',   path: '/create',  active: location.pathname === '/create' },
    { icon: Users,      label: 'Friends',  path: '/friends', active: location.pathname === '/friends' },
    { icon: Settings,   label: 'Settings', path: '/settings',active: location.pathname.startsWith('/settings') },
    ...(hasAdminAccess ? [{ icon: ShieldCheck, label: 'Admin', path: '/admin/users', active: location.pathname.startsWith('/admin') }] : []),
  ]

  return (
    <nav className="sl-bottom-nav">
      <div className="sl-content-inner">
        <Flex justify="space-around" align="center" style={{ padding: '6px 0 4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  minWidth: 44,
                }}
              >
                <Icon
                  style={{
                    width: '24px',
                    height: '24px',
                    color: item.active ? '#38BDF8' : '#64748B',
                    strokeWidth: item.active ? 2.5 : 2,
                  }}
                />
                <span style={{
                  color: item.active ? '#38BDF8' : '#64748B',
                  fontSize: '10px',
                  fontWeight: item.active ? 600 : 500,
                  whiteSpace: 'nowrap',
                }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </Flex>
      </div>
    </nav>
  )
}
