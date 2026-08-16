import { Button, Flex, Typography } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const SL = {
  nav: '#161819',
  border: '#2A2D30',
  accent: '#38BDF8',
  text: '#F1F5F9',
  muted: '#64748B',
}

export function Nav() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/signin')
  }

  return (
    <nav
      style={{
        backgroundColor: SL.nav,
        borderBottom: `1px solid ${SL.border}`,
        padding: '12px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Flex align="center" justify="space-between">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Typography.Text style={{ fontWeight: 300, color: SL.text, fontSize: 16 }}>
            Share
          </Typography.Text>
          <Typography.Text style={{ fontWeight: 700, color: SL.accent, fontSize: 16 }}>
            List
          </Typography.Text>
        </Link>

        <Flex align="center" gap={20}>
          {user ? (
            <>
              {user.permissions.includes('usermanage:listusers') && (
                <Link
                  to="/admin/users"
                  style={{ color: SL.muted, fontSize: 14, textDecoration: 'none' }}
                >
                  Users
                </Link>
              )}
              <Link
                to="/profile"
                style={{
                  color: SL.muted,
                  fontSize: 14,
                  textDecoration: 'none',
                  maxWidth: 160,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.email}
              </Link>
              <Typography.Link
                onClick={handleSignOut}
                style={{ color: SL.muted, fontSize: 14 }}
              >
                Sign out
              </Typography.Link>
            </>
          ) : (
            <>
              <Link to="/signin" style={{ color: SL.muted, fontSize: 14, textDecoration: 'none' }}>
                Sign in
              </Link>
              <Link to="/signup">
                <Button type="primary" size="small" style={{ borderRadius: 10 }}>
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </Flex>
      </Flex>
    </nav>
  )
}
