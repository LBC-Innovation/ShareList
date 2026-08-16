import { Form, Input, Button, Card, Flex, Typography, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Music2 } from 'lucide-react';
import { useState } from 'react';

const { Title, Text, Link } = Typography;

interface RegisterScreenProps {
  onBack: () => void;
  onRegister: () => void;
}

export function RegisterScreen({ onBack, onRegister }: RegisterScreenProps) {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (values: any) => {
    console.log('Register values:', values);
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onRegister();
    }, 2000);
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
        background: 'radial-gradient(circle at 50% 20%, rgba(74, 222, 128, 0.12) 0%, rgba(56, 189, 248, 0.08) 40%, transparent 70%)',
      }} />

      {/* Register Card */}
      <Card
        style={{
          maxWidth: '440px',
          width: '100%',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.08) 0%, rgba(28, 31, 33, 0.95) 50%, rgba(28, 31, 33, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(74, 222, 128, 0.15)',
          position: 'relative',
          zIndex: 1,
        }}
        styles={{ body: { padding: '48px 40px' } }}
      >
        {/* Logo */}
        <Flex justify="center" style={{ marginBottom: '20px' }}>
          <Flex align="center" gap={12}>
            <div style={{ position: 'relative', width: '36px', height: '36px' }}>
              <Music2 style={{
                width: '30px',
                height: '30px',
                color: '#4ADE80',
                position: 'absolute',
                top: 1,
                left: 1,
                strokeWidth: 2.5
              }} />
              <Music2 style={{
                width: '30px',
                height: '30px',
                color: '#4ADE80',
                position: 'absolute',
                top: 3,
                left: 3,
                opacity: 0.5,
                strokeWidth: 2.5
              }} />
            </div>
            <div style={{ fontSize: '28px', lineHeight: 1 }}>
              <span style={{ fontWeight: 300, color: 'white' }}>Share</span>
              <span style={{ fontWeight: 700, color: '#4ADE80' }}>List</span>
            </div>
          </Flex>
        </Flex>

        {/* Welcome Message */}
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
            Create Account
          </Title>
          <Text style={{ 
            color: '#64748B', 
            fontSize: '15px',
            lineHeight: '1.6'
          }}>
            Join ShareList and share music everywhere
          </Text>
        </Flex>

        {/* Register Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
        >
          <Form.Item
            name="displayName"
            rules={[{ required: true, message: 'Please enter your name' }]}
            style={{ marginBottom: '20px' }}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#64748B', fontSize: '16px' }} />}
              placeholder="Full name"
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
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
            style={{ marginBottom: '20px' }}
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

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 8, message: 'Password must be at least 8 characters' }
            ]}
            style={{ marginBottom: '20px' }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#64748B', fontSize: '16px' }} />}
              placeholder="Password (min. 8 characters)"
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
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
            style={{ marginBottom: '24px' }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#64748B', fontSize: '16px' }} />}
              placeholder="Confirm password"
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

          {/* Terms Agreement */}
          <Form.Item
            name="agreement"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value ? Promise.resolve() : Promise.reject(new Error('You must accept the terms')),
              },
            ]}
            style={{ marginBottom: '28px' }}
          >
            <Checkbox
              style={{
                color: '#94A3B8',
                fontSize: '13px'
              }}
            >
              <span style={{ color: '#94A3B8' }}>
                I agree to ShareList's{' '}
                <a href="#" style={{ color: '#4ADE80', textDecoration: 'none', fontWeight: 600 }}>
                  Terms of Service
                </a>
                {' '}and{' '}
                <a href="#" style={{ color: '#4ADE80', textDecoration: 'none', fontWeight: 600 }}>
                  Privacy Policy
                </a>
              </span>
            </Checkbox>
          </Form.Item>

          {/* Submit Button */}
          <Form.Item style={{ marginBottom: '20px' }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isLoading}
              style={{
                background: 'linear-gradient(135deg, #4ADE80 0%, #38BDF8 100%)',
                border: 'none',
                borderRadius: '12px',
                height: '52px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#FFFFFF',
                boxShadow: '0 8px 24px rgba(74, 222, 128, 0.3)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(74, 222, 128, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(74, 222, 128, 0.3)';
              }}
            >
              <span style={{ color: '#FFFFFF' }}>Create Account</span>
            </Button>
          </Form.Item>
        </Form>

        {/* Back to Login */}
        <Flex justify="center" align="center" style={{ marginTop: '24px' }}>
          <Text style={{ color: '#64748B', fontSize: '14px' }}>
            Already have an account?{' '}
            <Link
              onClick={onBack}
              style={{
                color: '#4ADE80',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Sign In
            </Link>
          </Text>
        </Flex>
      </Card>
    </div>
  );
}