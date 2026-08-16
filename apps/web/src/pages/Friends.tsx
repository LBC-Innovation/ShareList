import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Layout, Card, Flex, Typography, Tabs, Form, Input, Select, Button, Empty, Skeleton, notification, Tag } from 'antd'
import { MailOutlined, UserAddOutlined, SendOutlined, DeleteOutlined } from '@ant-design/icons'
import { Users } from 'lucide-react'
import * as api from '../lib/api'
import type { Friend, PendingInvite, ShareListSummary } from '../lib/api'

const { Content } = Layout
const { Text, Title } = Typography

const SL = {
  bg: '#111314', surface: '#1C1F21', nav: '#161819', border: '#2A2D30',
  accent: '#38BDF8', mint: '#4ADE80', text: '#F1F5F9', muted: '#64748B',
}

export function Friends() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [notifyApi, contextHolder] = notification.useNotification()
  const activeTab = searchParams.get('tab') === 'my-friends' ? 'my-friends' : 'add'

  const [lists, setLists] = useState<ShareListSummary[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [pending, setPending] = useState<PendingInvite[]>([])
  const [listsLoading, setListsLoading] = useState(true)
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const loadFriends = async () => {
    setFriendsLoading(true)
    const result = await api.listFriends()
    setFriendsLoading(false)
    if (api.isError(result)) {
      notifyApi.error({ message: 'Failed to load friends', description: result.error.message, placement: 'topRight' })
      return
    }
    setFriends(result.data.friends)
    setPending(result.data.pending)
  }

  useEffect(() => {
    void (async () => {
      const result = await api.listShareLists()
      setListsLoading(false)
      if (!api.isError(result)) setLists(result.data)
    })()
    void loadFriends()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInvite = async (values: { email: string; sharelistId: string }) => {
    setSending(true)
    try {
      const result = await api.sendFriendInvite(values.email.trim(), values.sharelistId)
      if (api.isError(result)) {
        notifyApi.error({ message: 'Invite failed', description: result.error.message, placement: 'topRight' })
        return
      }
      notifyApi.success({ message: 'Invite sent', description: `We emailed ${values.email}.`, placement: 'topRight' })
      form.resetFields()
      setSearchParams({ tab: 'my-friends' })
      void loadFriends()
    } finally {
      setSending(false)
    }
  }

  const handleResend = async (invite: PendingInvite) => {
    setResendingId(invite.id)
    try {
      const result = await api.resendFriendInvite(invite.id)
      if (api.isError(result)) {
        notifyApi.error({ message: 'Resend failed', description: result.error.message, placement: 'topRight' })
        return
      }
      notifyApi.success({ message: 'Invite resent', description: `We emailed ${invite.email} again.`, placement: 'topRight' })
    } finally {
      setResendingId(null)
    }
  }

  const handleDeletePending = async (invite: PendingInvite) => {
    setDeletingId(invite.id)
    try {
      const result = await api.deleteFriendInvite(invite.id)
      if (api.isError(result)) {
        notifyApi.error({ message: 'Delete failed', description: result.error.message, placement: 'topRight' })
        return
      }
      notifyApi.success({ message: 'Invite deleted', placement: 'topRight' })
      void loadFriends()
    } finally {
      setDeletingId(null)
    }
  }

  const addFriendTab = (
    <div style={{ paddingTop: '8px' }}>
      <Text style={{ color: SL.muted, fontSize: '13px', display: 'block', marginBottom: '20px', lineHeight: 1.6 }}>
        Enter a friend’s email and pick a ShareList. We’ll send them an invite to manage it with you.
      </Text>
      <Form form={form} layout="vertical" onFinish={values => void handleInvite(values)} requiredMark={false}>
        <Form.Item
          name="email"
          label={<span style={{ color: SL.text, fontWeight: 600, fontSize: '13px' }}>Friend’s email</span>}
          rules={[{ required: true, message: 'Enter an email' }, { type: 'email', message: 'Enter a valid email' }]}
        >
          <Input
            prefix={<MailOutlined style={{ color: SL.muted }} />}
            placeholder="friend@email.com"
            size="large"
            style={{ background: 'rgba(28, 31, 33, 0.6)', border: '1px solid #2A2D30', borderRadius: '12px', color: SL.text }}
          />
        </Form.Item>
        <Form.Item
          name="sharelistId"
          label={<span style={{ color: SL.text, fontWeight: 600, fontSize: '13px' }}>ShareList to share</span>}
          rules={[{ required: true, message: 'Select a ShareList' }]}
        >
          <Select
            placeholder={listsLoading ? 'Loading lists…' : 'Choose a ShareList'}
            size="large"
            loading={listsLoading}
            options={lists.map(list => ({ value: list.id, label: list.name }))}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={sending}
          icon={<UserAddOutlined />}
          disabled={lists.length === 0}
          style={{
            height: '48px',
            borderRadius: '12px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
            border: 'none',
            color: '#FFFFFF',
          }}
        >
          <span style={{ color: '#FFFFFF' }}>Send invite</span>
        </Button>
        {!listsLoading && lists.length === 0 && (
          <Text style={{ color: SL.muted, fontSize: '12px', display: 'block', marginTop: '12px' }}>
            Create a ShareList first, then you can invite a friend.
          </Text>
        )}
      </Form>
    </div>
  )

  const myFriendsTab = (
    <div style={{ paddingTop: '8px' }}>
      {friendsLoading && (
        <Flex vertical gap={12}>
          {[1, 2, 3].map(i => (
            <Skeleton.Input key={i} active style={{ width: '100%', height: '72px', borderRadius: '12px' }} />
          ))}
        </Flex>
      )}
      {!friendsLoading && friends.length === 0 && pending.length === 0 && (
        <Empty
          image={<Users style={{ width: '48px', height: '48px', color: SL.muted, opacity: 0.5 }} />}
          description={
            <Text style={{ color: SL.muted, fontSize: '13px' }}>
              No friends yet. Send an invite from Add Friend.
            </Text>
          }
        />
      )}
      {!friendsLoading && (pending.length > 0 || friends.length > 0) && (
        <Flex vertical gap={12}>
          {pending.map(invite => (
            <Card
              key={invite.id}
              style={{
                background: 'rgba(251, 191, 36, 0.06)',
                border: '1px solid rgba(251, 191, 36, 0.28)',
                borderRadius: '16px',
              }}
              styles={{ body: { padding: '16px' } }}
            >
              <Flex justify="space-between" align="flex-start" gap={8} style={{ marginBottom: '8px' }}>
                <Text style={{ color: SL.text, fontSize: '15px', fontWeight: 600 }}>
                  {invite.email}
                </Text>
                <Tag style={{
                  margin: 0,
                  background: 'rgba(251, 191, 36, 0.15)',
                  border: '1px solid rgba(251, 191, 36, 0.35)',
                  color: '#FBBF24',
                  fontWeight: 700,
                }}>
                  Pending
                </Tag>
              </Flex>
              <Text style={{ color: SL.muted, fontSize: '13px', display: 'block', marginBottom: '14px' }}>
                {invite.sharelistName}
              </Text>
              <Flex gap={8} wrap="wrap">
                <Button
                  icon={<SendOutlined />}
                  loading={resendingId === invite.id}
                  onClick={() => void handleResend(invite)}
                  style={{
                    borderRadius: '10px',
                    fontWeight: 600,
                    color: SL.accent,
                    borderColor: 'rgba(56, 189, 248, 0.35)',
                    background: 'rgba(56, 189, 248, 0.08)',
                  }}
                >
                  Resend invite
                </Button>
                <Button
                  icon={<DeleteOutlined />}
                  loading={deletingId === invite.id}
                  onClick={() => void handleDeletePending(invite)}
                  style={{
                    borderRadius: '10px',
                    fontWeight: 600,
                    color: '#EF4444',
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    background: 'rgba(239, 68, 68, 0.08)',
                  }}
                >
                  Delete
                </Button>
              </Flex>
            </Card>
          ))}
          {friends.map(friend => (
            <Card
              key={friend.userId}
              style={{
                background: 'rgba(28, 31, 33, 0.5)',
                border: '1px solid rgba(56, 189, 248, 0.12)',
                borderRadius: '16px',
              }}
              styles={{ body: { padding: '16px' } }}
            >
              <Text style={{ color: SL.text, fontSize: '15px', fontWeight: 600, display: 'block' }}>
                {friend.email || 'Unknown user'}
              </Text>
              <Text style={{ color: SL.muted, fontSize: '13px', display: 'block', marginTop: '6px' }}>
                {friend.lists.length === 0
                  ? 'No lists shared'
                  : friend.lists.map(l => l.name).join(' · ')}
              </Text>
            </Card>
          ))}
        </Flex>
      )}
    </div>
  )

  return (
    <Content style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 20px 100px', width: '100%' }}>
      {contextHolder}
      <Title level={1} style={{ color: SL.text, margin: '0 0 20px', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
        Friends
      </Title>
      <Tabs
        activeKey={activeTab}
        onChange={key => setSearchParams(key === 'my-friends' ? { tab: 'my-friends' } : {})}
        items={[
          { key: 'add', label: 'Add Friend', children: addFriendTab },
          { key: 'my-friends', label: 'My Friends', children: myFriendsTab },
        ]}
      />
    </Content>
  )
}
