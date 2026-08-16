import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Flex, Spin, Typography, Alert } from 'antd'
import { storeToken } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { AuthShell } from '../components/AuthShell'
import { BrandLogo } from '../components/BrandLogo'

const { Text } = Typography

export function MagicLinkConfirm() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const token = params.get('access_token')
    const type = params.get('type')

    if (!token || type !== 'magiclink') {
      setError('Invalid or missing magic link token. Please request a new link.')
      return
    }

    window.history.replaceState(null, '', window.location.pathname)
    storeToken(token)

    refreshUser().then(() => {
      navigate('/', { replace: true })
    }).catch(() => {
      setError('Failed to sign in. The link may have expired — please request a new one.')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthShell>
      {/* Background gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        background: 'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.12) 0%, rgba(74, 222, 128, 0.08) 40%, transparent 70%)',
      }} />

      <Card
        className="sl-auth-card"
        style={{
          maxWidth: '440px',
          width: '100%',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(28, 31, 33, 0.95) 50%, rgba(28, 31, 33, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          position: 'relative',
          zIndex: 1,
        }}
        styles={{ body: { padding: '48px 40px', textAlign: 'center' } }}
      >
        <Flex justify="center" style={{ marginBottom: '32px' }}>
          <BrandLogo height={40} />
        </Flex>

        {error ? (
          <Flex vertical gap={16} align="center">
            <Alert message={error} type="error" showIcon style={{ borderRadius: '10px', width: '100%' }} />
            <Button
              onClick={() => navigate('/signin')}
              style={{
                background: 'transparent',
                border: '1px solid #2A2D30',
                borderRadius: '12px',
                height: '48px',
                fontSize: '15px',
                fontWeight: 600,
                color: '#F1F5F9',
              }}
            >
              Back to Sign In
            </Button>
          </Flex>
        ) : (
          <Flex vertical gap={16} align="center">
            <Spin size="large" />
            <Text style={{ color: '#64748B', fontSize: '15px' }}>
              Signing you in…
            </Text>
          </Flex>
        )}
      </Card>
    </AuthShell>
  )
}
