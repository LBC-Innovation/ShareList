/**
 * CreateShareList — full-page flow for creating a new ShareList.
 */

import { Layout, Typography, Card } from 'antd'
import { LinkOutlined } from '@ant-design/icons'
import { CreateShareListForm } from '../components/CreateShareListForm'

const { Content } = Layout
const { Title, Text } = Typography

export function CreateShareList() {
  return (
    <Content>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', color: '#FFFFFF',
          boxShadow: '0 8px 24px rgba(56, 189, 248, 0.3)',
          margin: '0 auto 20px',
        }}>
          <LinkOutlined />
        </div>
        <Title level={1} style={{ color: '#F1F5F9', margin: '0 0 8px', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px' }}>
          New ShareList
        </Title>
        <Text style={{ color: '#94A3B8', fontSize: '15px' }}>
          Connect a playlist from your music service to get started
        </Text>
      </div>

      <Card
        style={{ background: 'rgba(28, 31, 33, 0.4)', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '16px', backdropFilter: 'blur(20px)' }}
        styles={{ body: { padding: '20px' } }}
      >
        <CreateShareListForm />
      </Card>
    </Content>
  )
}
