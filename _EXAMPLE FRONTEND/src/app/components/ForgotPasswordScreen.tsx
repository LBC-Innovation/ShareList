import { useState } from 'react';
import { Form, Input, Button, Card, Flex, Typography } from 'antd';
import { MailOutlined, LockOutlined, CheckCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Music2 } from 'lucide-react';

const { Title, Text, Link } = Typography;

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();
  const [emailSent, setEmailSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleSendEmail = (values: any) => {
    console.log('Send reset email to:', values.email);
    setIsSendingEmail(true);
    // Simulate sending email
    setTimeout(() => {
      setIsSendingEmail(false);
      setEmailSent(true);
    }, 1500);
  };

  const handleResetPassword = (values: any) => {
    console.log('Reset password:', values);
    setIsResettingPassword(true);
    // Simulate password reset
    setTimeout(() => {
      setIsResettingPassword(false);
      setIsResetting(false);
      onBack();
    }, 1500);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#111314',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Background gradient accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        background: 'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.10) 0%, rgba(139, 92, 246, 0.06) 40%, transparent 70%)',
      }} />

      {/* Forgot Password Card */}
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
        {/* Back Button */}
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            color: '#64748B',
            fontSize: '16px',
            padding: '4px 8px',
            height: 'auto',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#38BDF8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#64748B';
          }}
        />

        {/* Logo */}
        <Flex justify="center" style={{ marginBottom: '20px' }}>
          <Flex align="center" gap={12}>
            <div style={{ position: 'relative', width: '36px', height: '36px' }}>
              <Music2 style={{
                width: '30px',
                height: '30px',
                color: '#38BDF8',
                position: 'absolute',
                top: 1,
                left: 1,
                strokeWidth: 2.5
              }} />
              <Music2 style={{
                width: '30px',
                height: '30px',
                color: '#38BDF8',
                position: 'absolute',
                top: 3,
                left: 3,
                opacity: 0.5,
                strokeWidth: 2.5
              }} />
            </div>
            <div style={{ fontSize: '28px', lineHeight: 1 }}>
              <span style={{ fontWeight: 300, color: 'white' }}>Share</span>
              <span style={{ fontWeight: 700, color: '#38BDF8' }}>List</span>
            </div>
          </Flex>
        </Flex>

        {!emailSent ? (
          <>
            {/* Title & Description */}
            <Flex vertical align="center" style={{ marginBottom: '40px', textAlign: 'center' }}>
              <Title 
                level={2} 
                style={{ 
                  color: '#F1F5F9', 
                  marginBottom: '8px',
                  fontSize: '32px',
                  fontWeight: 700,
                  letterSpacing: '-0.5px'
                }}
              >
                Reset Password
              </Title>
              <Text style={{ 
                color: '#64748B', 
                fontSize: '15px',
                lineHeight: '1.6'
              }}>
                Enter your email and we'll send you a reset link
              </Text>
            </Flex>

            {/* Email Form */}
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSendEmail}
              requiredMark={false}
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
                style={{ marginBottom: '28px' }}
              >
                <Input
                  prefix={<MailOutlined style={{ color: '#64748B', fontSize: '16px' }} />}
                  placeholder="Email address"
                  size="large"
                  style={{
                    background: 'rgba(28, 31, 33, 0.6)',
                    border: '1px solid #2A2D30',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: '#F1F5F9',
                    fontSize: '15px'
                  }}
                />
              </Form.Item>

              {/* Submit Button */}
              <Form.Item style={{ marginBottom: '20px' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={isSendingEmail}
                  style={{
                    background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    height: '52px',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    boxShadow: '0 8px 24px rgba(56, 189, 248, 0.3)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(56, 189, 248, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(56, 189, 248, 0.3)';
                  }}
                >
                  <span style={{ color: '#FFFFFF' }}>Send Reset Link</span>
                </Button>
              </Form.Item>
            </Form>

            {/* Alternative: Remember password? */}
            <Flex justify="center" align="center" style={{ marginTop: '24px' }}>
              <Text style={{ color: '#64748B', fontSize: '14px' }}>
                I remember my password{' '}
                <Link
                  onClick={onBack}
                  style={{
                    color: '#38BDF8',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Back to Login
                </Link>
              </Text>
            </Flex>
          </>
        ) : !isResetting ? (
          <>
            {/* Success Message */}
            <Flex vertical align="center" style={{ marginBottom: '40px', textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(74, 222, 128, 0.15)',
                border: '2px solid rgba(74, 222, 128, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
              }}>
                <CheckCircleOutlined style={{ fontSize: '40px', color: '#4ADE80' }} />
              </div>
              <Title 
                level={2} 
                style={{ 
                  color: '#F1F5F9', 
                  marginBottom: '12px',
                  fontSize: '28px',
                  fontWeight: 700,
                  letterSpacing: '-0.5px'
                }}
              >
                Check Your Email
              </Title>
              <Text style={{ 
                color: '#64748B', 
                fontSize: '15px',
                lineHeight: '1.6',
                marginBottom: '8px'
              }}>
                We've sent a password reset link to
              </Text>
              <Text style={{ 
                color: '#38BDF8', 
                fontSize: '15px',
                fontWeight: 600
              }}>
                {form.getFieldValue('email')}
              </Text>
            </Flex>

            {/* Instructions */}
            <div style={{
              padding: '20px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '12px',
              marginBottom: '28px'
            }}>
              <Text style={{ color: '#94A3B8', fontSize: '14px', display: 'block', lineHeight: '1.6' }}>
                Click the link in the email to reset your password. If you don't see it, check your spam folder.
              </Text>
            </div>

            {/* Buttons */}
            <Flex gap={12} style={{ marginBottom: '20px' }}>
              <Button
                size="large"
                block
                onClick={onBack}
                style={{
                  background: 'transparent',
                  border: '1px solid #2A2D30',
                  borderRadius: '12px',
                  height: '48px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#F1F5F9',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#38BDF8';
                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2A2D30';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Back to Login
              </Button>
              <Button
                size="large"
                block
                onClick={() => setIsResetting(true)}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '12px',
                  height: '48px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#38BDF8',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)';
                }}
              >
                Enter Code
              </Button>
            </Flex>

            {/* Resend */}
            <Flex justify="center" align="center" style={{ marginTop: '16px' }}>
              <Text style={{ color: '#64748B', fontSize: '14px' }}>
                Didn't receive the email?{' '}
                <Link
                  onClick={() => handleSendEmail(form.getFieldsValue())}
                  style={{
                    color: '#38BDF8',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Resend
                </Link>
              </Text>
            </Flex>
          </>
        ) : (
          <>
            {/* Reset Password Form */}
            <Flex vertical align="center" style={{ marginBottom: '40px', textAlign: 'center' }}>
              <Title 
                level={2} 
                style={{ 
                  color: '#F1F5F9', 
                  marginBottom: '8px',
                  fontSize: '32px',
                  fontWeight: 700,
                  letterSpacing: '-0.5px'
                }}
              >
                Set New Password
              </Title>
              <Text style={{ 
                color: '#64748B', 
                fontSize: '15px',
                lineHeight: '1.6'
              }}>
                Enter your reset code and new password
              </Text>
            </Flex>

            <Form
              form={resetForm}
              layout="vertical"
              onFinish={handleResetPassword}
              requiredMark={false}
            >
              <Form.Item
                name="code"
                rules={[{ required: true, message: 'Please enter the reset code' }]}
                style={{ marginBottom: '20px' }}
              >
                <Input
                  prefix={<MailOutlined style={{ color: '#64748B', fontSize: '16px' }} />}
                  placeholder="Reset code from email"
                  size="large"
                  style={{
                    background: 'rgba(28, 31, 33, 0.6)',
                    border: '1px solid #2A2D30',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: '#F1F5F9',
                    fontSize: '15px'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="newPassword"
                rules={[
                  { required: true, message: 'Please enter a new password' },
                  { min: 8, message: 'Password must be at least 8 characters' }
                ]}
                style={{ marginBottom: '20px' }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#64748B', fontSize: '16px' }} />}
                  placeholder="New password (min. 8 characters)"
                  size="large"
                  style={{
                    background: 'rgba(28, 31, 33, 0.6)',
                    border: '1px solid #2A2D30',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: '#F1F5F9',
                    fontSize: '15px'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="confirmNewPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Please confirm your new password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
                style={{ marginBottom: '28px' }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#64748B', fontSize: '16px' }} />}
                  placeholder="Confirm new password"
                  size="large"
                  style={{
                    background: 'rgba(28, 31, 33, 0.6)',
                    border: '1px solid #2A2D30',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: '#F1F5F9',
                    fontSize: '15px'
                  }}
                />
              </Form.Item>

              {/* Submit Button */}
              <Form.Item style={{ marginBottom: '20px' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={isResettingPassword}
                  style={{
                    background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    height: '52px',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    boxShadow: '0 8px 24px rgba(56, 189, 248, 0.3)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(56, 189, 248, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(56, 189, 248, 0.3)';
                  }}
                >
                  <span style={{ color: '#FFFFFF' }}>Reset Password</span>
                </Button>
              </Form.Item>
            </Form>

            {/* Back to Login */}
            <Flex justify="center" align="center" style={{ marginTop: '24px' }}>
              <Text style={{ color: '#64748B', fontSize: '14px' }}>
                Remember your password?{' '}
                <Link
                  onClick={onBack}
                  style={{
                    color: '#38BDF8',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Sign In
                </Link>
              </Text>
            </Flex>
          </>
        )}
      </Card>
    </div>
  );
}