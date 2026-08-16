import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Flex, Typography, Alert, Spin } from 'antd'
import { Music2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AuthShell } from '../components/AuthShell'
import * as api from '../lib/api'
import type { InvitePreview } from '../lib/api'

const { Title, Text } = Typography

const SL = {
  accent: '#38BDF8', mint: '#4ADE80',
  text: '#F1F5F9', muted: '#64748B',
}

export function InviteLanding() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!token) return
    api.storeInviteToken(token)
    void (async () => {
      const result = await api.getInvitePreview(token)
      if (api.isError(result)) {
        setError(result.error.message)
        return
      }
      setPreview(result.data)
    })()
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    if (!user) {
      navigate(`/signup?invite=${encodeURIComponent(token)}`)
      return
    }
    setAccepting(true)
    const result = await api.acceptFriendInvite(token)
    setAccepting(false)
    if (api.isError(result)) {
      setError(result.error.message)
      return
    }
    api.clearInviteToken()
    navigate('/friends?tab=my-friends')
  }

  return (
    <AuthShell>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.12) 0%, rgba(74, 222, 128, 0.08) 40%, transparent 70%)',
      }} />
      <Card
        className="sl-auth-card"
        style={{
          maxWidth: '440px', width: '100%', borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(28, 31, 33, 0.95) 50%)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          position: 'relative', zIndex: 1,
        }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <Flex justify="center" style={{ marginBottom: '20px' }}>
          <Flex align="center" gap={12}>
            <Music2 style={{ width: '28px', height: '28px', color: SL.mint, strokeWidth: 2.5 }} />
            <div style={{ fontSize: '24px' }}>
              <span style={{ fontWeight: 300, color: 'white' }}>Share</span>
              <span style={{ fontWeight: 700, color: SL.mint }}>List</span>
            </div>
          </Flex>
        </Flex>

        {authLoading && (
          <Flex justify="center" style={{ padding: '24px 0' }}><Spin /></Flex>
        )}

        {!authLoading && error && (
          <Alert message={error} type="error" showIcon style={{ borderRadius: '10px' }} />
        )}

        {!authLoading && !error && !preview && (
          <Flex justify="center" style={{ padding: '24px 0' }}><Spin /></Flex>
        )}

        {!authLoading && preview && !error && (
          <>
            <Title level={3} style={{ color: SL.text, textAlign: 'center', marginBottom: '8px' }}>
              You’re invited
            </Title>
            <Text style={{ color: SL.muted, display: 'block', textAlign: 'center', marginBottom: '24px', lineHeight: 1.6 }}>
              <span style={{ color: SL.accent, fontWeight: 600 }}>{preview.inviterEmail}</span>
              {' '}wants to share{' '}
              <span style={{ color: SL.mint, fontWeight: 600 }}>{preview.sharelistName}</span>
              {' '}with you.
            </Text>
            <Button
              type="primary"
              size="large"
              block
              loading={accepting}
              onClick={() => void handleAccept()}
              style={{
                height: '48px',
                borderRadius: '12px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                border: 'none',
                marginBottom: '16px',
                color: '#FFFFFF',
              }}
            >
              <span style={{ color: '#FFFFFF' }}>{user ? 'Accept' : 'Accept & continue'}</span>
            </Button>
            {!user && (
              <Text style={{ color: SL.muted, fontSize: '13px', display: 'block', textAlign: 'center' }}>
                Already have an account?{' '}
                <a
                  href={`/signin?invite=${encodeURIComponent(token ?? '')}`}
                  style={{ color: SL.accent, fontWeight: 600 }}
                  onClick={e => {
                    e.preventDefault()
                    navigate(`/signin?invite=${encodeURIComponent(token ?? '')}`)
                  }}
                >
                  Sign in
                </a>
              </Text>
            )}
            <Text style={{ color: SL.muted, fontSize: '12px', display: 'block', textAlign: 'center', marginTop: '16px' }}>
              If you don’t want this invite, you can ignore it.
            </Text>
          </>
        )}
      </Card>
    </AuthShell>
  )
}
