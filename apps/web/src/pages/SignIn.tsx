import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, Flex, Form, Input, Typography, Alert } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { AuthShell } from '../components/AuthShell'
import { BrandLogo } from '../components/BrandLogo'
import * as api from '../lib/api'
import { isReturningUser } from '../lib/returning-user'

const { Title, Text, Link } = Typography

export function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form] = Form.useForm()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [returning] = useState(() => isReturningUser())
  const invite = searchParams.get('invite')
  const next = searchParams.get('next')
  const expired = searchParams.get('reason') === 'expired'

  const handleFinish = async (values: { email: string; password: string }) => {
    setError(null)
    setLoading(true)
    const err = await signIn(values.email, values.password)
    if (err) {
      setLoading(false)
      setError(err)
      return
    }
    if (invite) api.storeInviteToken(invite)
    const inviteErr = await api.acceptStoredInvite()
    setLoading(false)
    if (invite || api.peekInviteToken()) {
      if (inviteErr) setError(inviteErr)
      navigate('/friends?tab=my-friends')
      return
    }
    navigate(next && next.startsWith('/') ? next : '/')
  }

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
        styles={{ body: { padding: '48px 40px' } }}
      >
        {/* Logo */}
        <Flex justify="center" style={{ marginBottom: '20px' }}>
          <BrandLogo height={40} />
        </Flex>

        {/* Heading */}
        <Flex vertical align="center" style={{ marginBottom: '40px', textAlign: 'center' }}>
          <Title level={2} style={{ color: '#F1F5F9', marginBottom: '8px', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            {returning ? 'Welcome Back!' : 'Great to meet you!'}
          </Title>
          <Text style={{ color: '#64748B', fontSize: '15px', lineHeight: '1.6' }}>
            Share your music across all platforms
          </Text>
        </Flex>

        {/* Form */}
        <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Please enter a valid email' }]}
            style={{ marginBottom: '20px' }}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#64748B', fontSize: '16px' }} />}
              placeholder="Email address"
              size="large"
              style={{ background: 'rgba(28, 31, 33, 0.6)', border: '1px solid #2A2D30', borderRadius: '12px', color: '#F1F5F9', fontSize: '15px' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
            style={{ marginBottom: '12px' }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#64748B', fontSize: '16px' }} />}
              placeholder="Password"
              size="large"
              style={{ background: 'rgba(28, 31, 33, 0.6)', border: '1px solid #2A2D30', borderRadius: '12px', color: '#F1F5F9', fontSize: '15px' }}
            />
          </Form.Item>

          {/* Forgot password */}
          <Flex justify="flex-end" style={{ marginBottom: '24px' }}>
            <Link
              onClick={() => navigate('/forgot-password')}
              style={{ color: '#38BDF8', fontSize: '14px', fontWeight: 500 }}
            >
              Forgot password?
            </Link>
          </Flex>

          {expired && !error && (
            <Form.Item style={{ marginBottom: '16px' }}>
              <Alert message="Your session expired. Sign in again." type="info" showIcon style={{ borderRadius: '10px' }} />
            </Form.Item>
          )}

          {error && (
            <Form.Item style={{ marginBottom: '16px' }}>
              <Alert message={error} type="error" showIcon style={{ borderRadius: '10px' }} />
            </Form.Item>
          )}

          {/* Submit */}
          <Form.Item style={{ marginBottom: '20px' }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{
                background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                border: 'none',
                borderRadius: '12px',
                height: '52px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#FFFFFF',
                boxShadow: '0 8px 24px rgba(56, 189, 248, 0.3)',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(56, 189, 248, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(56, 189, 248, 0.3)'
              }}
            >
              <span style={{ color: '#FFFFFF' }}>Sign In</span>
            </Button>
          </Form.Item>
        </Form>

        {/* Divider */}
        <Flex justify="center" align="center" style={{ margin: '24px 0', position: 'relative' }}>
          <div style={{ position: 'absolute', width: '100%', height: '1px', background: '#2A2D30' }} />
          <Text style={{ background: 'transparent', padding: '0 16px', color: '#64748B', fontSize: '13px', position: 'relative', zIndex: 1 }}>
            or
          </Text>
        </Flex>

        {/* Register button */}
        <Button
          icon={<MailOutlined />}
          size="large"
          block
          style={{
            background: 'transparent',
            border: '1px solid #2A2D30',
            borderRadius: '12px',
            height: '52px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#F1F5F9',
            transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#38BDF8'
            e.currentTarget.style.background = 'rgba(56, 189, 248, 0.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2A2D30'
            e.currentTarget.style.background = 'transparent'
          }}
          onClick={() => navigate(invite ? `/signup?invite=${encodeURIComponent(invite)}` : '/signup')}
        >
          Create New Account
        </Button>

        {/* Footer */}
        <Flex justify="center" style={{ marginTop: '32px' }}>
          <div style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', lineHeight: '1.6' }}>
            By continuing, you agree to ShareList's{' '}
            <a href="#" style={{ color: '#38BDF8', textDecoration: 'none' }}>Terms of Service</a>
            {' '}and{' '}
            <a href="#" style={{ color: '#38BDF8', textDecoration: 'none' }}>Privacy Policy</a>
          </div>
        </Flex>
      </Card>
    </AuthShell>
  )
}
