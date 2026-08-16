import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Flex, Form, Input, Typography, Alert } from 'antd'
import { LockOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { Music2 } from 'lucide-react'
import { confirmPasswordReset, isError } from '../lib/api'

const { Title, Text } = Typography

export function PasswordResetConfirm() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const token = params.get('access_token')
    const type = params.get('type')
    if (token && type === 'recovery') {
      setAccessToken(token)
    } else {
      setError('Invalid or missing reset token. Please request a new reset link.')
    }
  }, [])

  const handleFinish = async (values: { password: string }) => {
    if (!accessToken) return
    setError(null)
    setLoading(true)
    const result = await confirmPasswordReset(accessToken, values.password)
    setLoading(false)
    if (isError(result)) { setError(result.error.message); return }
    window.history.replaceState(null, '', window.location.pathname)
    navigate('/signin')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#111314',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        background: 'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.10) 0%, rgba(139, 92, 246, 0.06) 40%, transparent 70%)',
      }} />

      <Card
        style={{
          maxWidth: '440px',
          width: '100%',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.06) 0%, rgba(28, 31, 33, 0.95) 50%, rgba(28, 31, 33, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          position: 'relative',
          zIndex: 1,
        }}
        styles={{ body: { padding: '48px 40px' } }}
      >
        {/* Back button */}
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/signin')}
          style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            color: '#64748B',
            fontSize: '16px',
            padding: '4px 8px',
            height: 'auto',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#38BDF8' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B' }}
        />

        {/* Logo */}
        <Flex justify="center" style={{ marginBottom: '20px' }}>
          <Flex align="center" gap={12}>
            <div style={{ position: 'relative', width: '36px', height: '36px' }}>
              <Music2 style={{ width: '30px', height: '30px', color: '#38BDF8', position: 'absolute', top: 1, left: 1, strokeWidth: 2.5 }} />
              <Music2 style={{ width: '30px', height: '30px', color: '#38BDF8', position: 'absolute', top: 3, left: 3, opacity: 0.5, strokeWidth: 2.5 }} />
            </div>
            <div style={{ fontSize: '28px', lineHeight: 1 }}>
              <span style={{ fontWeight: 300, color: 'white' }}>Share</span>
              <span style={{ fontWeight: 700, color: '#38BDF8' }}>List</span>
            </div>
          </Flex>
        </Flex>

        <Flex vertical align="center" style={{ marginBottom: '40px', textAlign: 'center' }}>
          <Title level={2} style={{ color: '#F1F5F9', marginBottom: '8px', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Set New Password
          </Title>
          <Text style={{ color: '#64748B', fontSize: '15px', lineHeight: '1.6' }}>
            Choose a strong password for your account
          </Text>
        </Flex>

        <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
            style={{ marginBottom: '20px' }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#64748B', fontSize: '16px' }} />}
              placeholder="New password (min. 6 characters)"
              size="large"
              disabled={!accessToken}
              style={{ background: 'rgba(28, 31, 33, 0.6)', border: '1px solid #2A2D30', borderRadius: '12px', padding: '12px 16px', color: '#F1F5F9', fontSize: '15px' }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve()
                  return Promise.reject(new Error('Passwords do not match'))
                },
              }),
            ]}
            style={{ marginBottom: '28px' }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#64748B', fontSize: '16px' }} />}
              placeholder="Confirm new password"
              size="large"
              disabled={!accessToken}
              style={{ background: 'rgba(28, 31, 33, 0.6)', border: '1px solid #2A2D30', borderRadius: '12px', padding: '12px 16px', color: '#F1F5F9', fontSize: '15px' }}
            />
          </Form.Item>

          {error && (
            <Form.Item style={{ marginBottom: '16px' }}>
              <Alert message={error} type="error" showIcon style={{ borderRadius: '10px' }} />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: '20px' }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              disabled={!accessToken}
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
                if (!accessToken) return
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(56, 189, 248, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(56, 189, 248, 0.3)'
              }}
            >
              <span style={{ color: '#FFFFFF' }}>Reset Password</span>
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
