import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Flex, Form, Input, Typography, Alert } from 'antd'
import { useAuth } from '../context/AuthContext'
import { updateProfile, isError } from '../lib/api'
import { UserAvatar } from '../components/UserAvatar'
import { fetchGravatarProfileUrl, openGravatarQuickEditor } from '../lib/avatar'

const SL = {
  surface: '#1C1F21',
  border: '#2A2D30',
  accent: '#38BDF8',
  text: '#F1F5F9',
  muted: '#64748B',
}

export function Profile() {
  const { user, signOut, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [gravatarLoading, setGravatarLoading] = useState(false)

  const [form] = Form.useForm()
  const watchedAvatarUrl = Form.useWatch('avatarUrl', form)

  if (!user) return null

  const handleFinish = async (values: { displayName: string; avatarUrl?: string }) => {
    setError(null)
    setSuccess(false)
    setLoading(true)
    const result = await updateProfile(user.id, {
      display_name: values.displayName,
      avatar_url: values.avatarUrl || undefined,
    })
    setLoading(false)
    if (isError(result)) { setError(result.error.message); return }
    await refreshUser()
    setSuccess(true)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/signin')
  }

  const applyGravatarUrl = async (): Promise<boolean> => {
    if (!user.email) return false
    const url = await fetchGravatarProfileUrl(user.email)
    if (!url) return false
    form.setFieldsValue({ avatarUrl: url })
    return true
  }

  const handleGetGravatar = async () => {
    setError(null)
    setSuccess(false)
    if (!user.email) {
      setError('Your account has no email to look up on Gravatar.')
      return
    }

    setGravatarLoading(true)
    const alreadyLinked = await applyGravatarUrl()
    if (alreadyLinked) {
      setGravatarLoading(false)
      return
    }

    const opened = openGravatarQuickEditor(user.email, {
      onProfileUpdated: () => { void applyGravatarUrl() },
      onClosed: () => {
        void (async () => {
          const found = await applyGravatarUrl()
          setGravatarLoading(false)
          if (!found) {
            setError('No Gravatar was found for this email. Sign in on Gravatar, then try again.')
          }
        })()
      },
    })

    if (!opened) {
      setGravatarLoading(false)
      setError('Allow popups to sign in to Gravatar, or paste your profile link above.')
    }
  }

  return (
    <div style={{ maxWidth: 448, margin: '0 auto', padding: '24px 16px 28px' }}>
      {/* Avatar + identity */}
      <Flex align="center" gap={16} style={{ marginBottom: 32 }}>
        <UserAvatar
          src={watchedAvatarUrl ?? user.avatarUrl}
          name={user.displayName ?? user.email}
          size={56}
          style={{
            backgroundColor: 'rgba(56,189,248,0.15)',
            border: '1px solid rgba(56,189,248,0.3)',
            color: SL.accent,
            fontWeight: 700,
            fontSize: 20,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <Typography.Text
            style={{
              color: SL.text,
              fontWeight: 600,
              fontSize: 18,
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.displayName ?? user.email}
          </Typography.Text>
          {user.displayName && (
            <Typography.Text
              style={{
                color: SL.muted,
                fontSize: 14,
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.email}
            </Typography.Text>
          )}
        </div>
      </Flex>

      {/* Profile card */}
      <div
        style={{
          backgroundColor: SL.surface,
          border: `1px solid ${SL.border}`,
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        <Typography.Text
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: SL.muted,
            display: 'block',
            marginBottom: 20,
          }}
        >
          Profile
        </Typography.Text>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
          initialValues={{ displayName: user.displayName ?? '', avatarUrl: user.avatarUrl ?? '' }}
        >
          <Form.Item
            name="displayName"
            label={<span style={{ color: SL.text, fontSize: 14, fontWeight: 500 }}>Display name</span>}
          >
            <Input
              placeholder={user.email?.split('@')[0]}
              size="large"
              style={{ borderRadius: 12 }}
            />
          </Form.Item>

          <Form.Item
            name="avatarUrl"
            label={<span style={{ color: SL.text, fontSize: 14, fontWeight: 500 }}>Avatar URL</span>}
            extra={<span style={{ color: SL.muted, fontSize: 12 }}>Use Get my Gravatar to sign in, or paste https://gravatar.com/your-username</span>}
          >
            <Input placeholder="https://gravatar.com/your-username" size="large" style={{ borderRadius: 12 }} />
          </Form.Item>

          <Form.Item>
            <Button
              htmlType="button"
              size="large"
              block
              loading={gravatarLoading}
              onClick={() => { void handleGetGravatar() }}
              style={{
                borderRadius: 12,
                fontWeight: 600,
                color: SL.accent,
                borderColor: 'rgba(56,189,248,0.4)',
                background: 'rgba(56,189,248,0.1)',
              }}
            >
              Get my Gravatar
            </Button>
          </Form.Item>

          {error && (
            <Form.Item>
              <Alert message={error} type="error" showIcon style={{ borderRadius: 10 }} />
            </Form.Item>
          )}
          {success && (
            <Form.Item>
              <Alert message="Saved" type="success" showIcon style={{ borderRadius: 10 }} />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
              style={{ borderRadius: 12, fontWeight: 600, color: '#FFFFFF' }}
            >
              Save changes
            </Button>
          </Form.Item>
        </Form>
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Typography.Link
          onClick={handleSignOut}
          style={{ color: SL.muted, fontSize: 14 }}
        >
          Sign out
        </Typography.Link>
      </div>
    </div>
  )
}
