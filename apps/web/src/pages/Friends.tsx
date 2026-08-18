import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Layout, Card, Flex, Typography, Tabs, Form, Input, Select, Button, Empty,
  Skeleton, notification, Tag, Switch, Popconfirm, Grid, Collapse,
} from 'antd'
import { MailOutlined, UserAddOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { ChevronDown, ChevronLeft, Users } from 'lucide-react'
import * as api from '../lib/api'
import type { FriendPerson, IncomingShareRequest, ShareListSummary } from '../lib/api'
import { ConnectedPlatformIcons } from '../components/ConnectedPlatformIcons'

const { Content } = Layout
const { Text, Title } = Typography

const SL = {
  bg: '#111314', surface: '#1C1F21', nav: '#161819', border: '#2A2D30',
  accent: '#38BDF8', mint: '#4ADE80', text: '#F1F5F9', muted: '#64748B',
}

function personKey(person: FriendPerson): string {
  return person.userId ?? person.email.toLowerCase()
}

function formatRequestedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PlaylistShareSelect({
  person,
  lists,
  onToggle,
}: {
  person: FriendPerson
  lists: ShareListSummary[]
  onToggle: (person: FriendPerson, listId: string, shared: boolean) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const sharedCount = person.sharedListIds.length
  const label = sharedCount === 0
    ? 'No lists'
    : `${sharedCount} list${sharedCount === 1 ? '' : 's'}`

  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      value={label}
      size="middle"
      style={{ width: '100%', minWidth: 0 }}
      styles={{ popup: { root: { padding: 0 } } }}
      popupRender={() => (
        <div
          style={{ minWidth: 260, padding: 0, margin: 0 }}
          onMouseDown={event => event.preventDefault()}
        >
          {lists.length === 0 ? (
            <div style={{ padding: '18px 14px' }}>
              <Text style={{ color: SL.muted, fontSize: '13px' }}>Create a ShareList first.</Text>
            </div>
          ) : lists.map(list => {
            const checked = person.sharedListIds.includes(list.id)
            const busy = busyId === list.id
            const toggle = async () => {
              if (busy) return
              setBusyId(list.id)
              try {
                await onToggle(person, list.id, !checked)
              } finally {
                setBusyId(null)
              }
            }
            return (
              <Flex
                key={list.id}
                align="center"
                justify="space-between"
                gap={12}
                onClick={() => void toggle()}
                style={{
                  padding: '18px 14px',
                  minHeight: '56px',
                  margin: 0,
                  cursor: busy ? 'wait' : 'pointer',
                  borderRadius: 0,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={event => { event.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)' }}
                onMouseLeave={event => { event.currentTarget.style.background = 'transparent' }}
              >
                <Text
                  style={{
                    color: SL.text,
                    fontSize: '13px',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {list.name}
                </Text>
                <Switch
                  size="small"
                  checked={checked}
                  loading={busy}
                  style={{ pointerEvents: 'none' }}
                />
              </Flex>
            )
          })}
        </div>
      )}
    />
  )
}

export function Friends() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [notifyApi, contextHolder] = notification.useNotification()
  const screens = Grid.useBreakpoint()
  const isCompact = !screens.md
  const tabParam = searchParams.get('tab')
  const activeTab = tabParam === 'pending' ? 'pending' : 'my-friends'

  const [lists, setLists] = useState<ShareListSummary[]>([])
  const [people, setPeople] = useState<FriendPerson[]>([])
  const [incoming, setIncoming] = useState<IncomingShareRequest[]>([])
  const [listsLoading, setListsLoading] = useState(true)
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [addFriendOpen, setAddFriendOpen] = useState(false)
  const [removingKey, setRemovingKey] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const ownedLists = useMemo(() => lists.filter(list => !list.isShared), [lists])

  const loadFriends = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setFriendsLoading(true)
    const result = await api.listFriends()
    if (!opts?.silent) setFriendsLoading(false)
    if (api.isError(result)) {
      notifyApi.error({ message: 'Failed to load friends', description: result.error.message, placement: 'topRight' })
      return
    }
    setPeople(result.data.people ?? [])
    setIncoming(result.data.incoming ?? [])
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
      setAddFriendOpen(false)
      void loadFriends({ silent: true })
    } finally {
      setSending(false)
    }
  }

  const patchPersonLists = (target: FriendPerson, listId: string, shared: boolean) => {
    setPeople(prev => prev.map(person => {
      if (personKey(person) !== personKey(target)) return person
      const sharedListIds = shared
        ? (person.sharedListIds.includes(listId) ? person.sharedListIds : [...person.sharedListIds, listId])
        : person.sharedListIds.filter(id => id !== listId)
      return { ...person, sharedListIds }
    }))
  }

  const handleToggleList = async (person: FriendPerson, listId: string, shared: boolean) => {
    const payload = { sharelistId: listId, userId: person.userId, email: person.email }
    const result = shared
      ? await api.shareListWithFriend(payload)
      : await api.unshareListWithFriend(payload)
    if (api.isError(result)) {
      notifyApi.error({
        message: shared ? 'Could not share list' : 'Could not unshare list',
        description: result.error.message,
        placement: 'topRight',
      })
      return
    }
    patchPersonLists(person, listId, shared)
  }

  const handleRemove = async (person: FriendPerson) => {
    const key = personKey(person)
    setRemovingKey(key)
    try {
      const result = await api.removeFriend({ userId: person.userId, email: person.email })
      if (api.isError(result)) {
        notifyApi.error({ message: 'Could not remove friend', description: result.error.message, placement: 'topRight' })
        return
      }
      setPeople(prev => prev.filter(row => personKey(row) !== key))
      notifyApi.success({ message: 'Friend removed', placement: 'topRight' })
    } finally {
      setRemovingKey(null)
    }
  }

  const handleAcceptRequest = async (request: IncomingShareRequest) => {
    setActingId(request.id)
    try {
      const result = await api.acceptShareRequest(request.id)
      if (api.isError(result)) {
        notifyApi.error({ message: 'Could not accept request', description: result.error.message, placement: 'topRight' })
        return
      }
      setIncoming(prev => prev.filter(row => row.id !== request.id))
      notifyApi.success({
        message: 'Request accepted',
        description: `You now share “${request.sharelistName}” with ${request.inviterEmail}.`,
        placement: 'topRight',
      })
      void loadFriends({ silent: true })
    } finally {
      setActingId(null)
    }
  }

  const handleRejectRequest = async (request: IncomingShareRequest) => {
    setActingId(request.id)
    try {
      const result = await api.rejectShareRequest(request.id)
      if (api.isError(result)) {
        notifyApi.error({ message: 'Could not reject request', description: result.error.message, placement: 'topRight' })
        return
      }
      setIncoming(prev => prev.filter(row => row.id !== request.id))
      notifyApi.success({ message: 'Request declined', placement: 'topRight' })
    } finally {
      setActingId(null)
    }
  }

  const addFriendAccordion = (
    <Collapse
      accordion
      className="sl-add-friend-collapse"
      activeKey={addFriendOpen ? ['add'] : []}
      onChange={keys => {
        const key = Array.isArray(keys) ? keys[0] : keys
        setAddFriendOpen(key === 'add')
      }}
      bordered={false}
      expandIconPlacement="end"
      expandIcon={({ isActive }) =>
        isActive
          ? <ChevronDown size={18} strokeWidth={2.75} color="#F1F5F9" />
          : <ChevronLeft size={18} strokeWidth={2.75} color="#F1F5F9" />
      }
      style={{
        background: 'rgba(28, 31, 33, 0.4)',
        border: '1px solid rgba(56, 189, 248, 0.15)',
        borderRadius: '16px',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
      }}
      styles={{
        header: {
          color: SL.text,
          fontWeight: 700,
          fontSize: '15px',
          padding: isCompact ? '12px 16px' : '14px 20px',
          alignItems: 'center',
          minHeight: '56px',
          cursor: 'pointer',
        },
        icon: {
          color: SL.text,
        },
        body: {
          borderTop: '1px solid rgba(56, 189, 248, 0.1)',
          padding: isCompact ? '20px 16px 24px' : '24px 32px 32px',
          background: 'transparent',
        },
      }}
      items={[{
        key: 'add',
        label: (
          <Flex align="center" gap={12}>
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: SL.accent,
                flexShrink: 0,
                fontSize: '16px',
              }}
            >
              <UserAddOutlined />
            </span>
            Add New Friend
          </Flex>
        ),
        children: (
          <>
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
                  options={ownedLists.map(list => ({ value: list.id, label: list.name }))}
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
                disabled={ownedLists.length === 0}
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
              {!listsLoading && ownedLists.length === 0 && (
                <Text style={{ color: SL.muted, fontSize: '12px', display: 'block', marginTop: '12px' }}>
                  Create a ShareList first, then you can invite a friend.
                </Text>
              )}
            </Form>
          </>
        ),
      }]}
    />
  )

  const myFriendsTab = (
    <div style={{ paddingTop: '8px' }}>
      <Flex vertical gap={16}>
        {addFriendAccordion}
      <Card
        style={{
          background: 'rgba(28, 31, 33, 0.4)',
          border: '1px solid rgba(56, 189, 248, 0.1)',
          borderRadius: '16px',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: 0 } }}
      >
        {!isCompact && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(56, 189, 248, 0.1)', background: 'rgba(17, 19, 20, 0.4)' }}>
            <Flex>
              <div style={{ flex: '1 1 32%', paddingRight: '16px' }}>
                <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>User</Text>
              </div>
              <div style={{ width: '110px', paddingRight: '16px' }}>
                <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</Text>
              </div>
              <div style={{ flex: '1 1 38%', paddingRight: '16px', minWidth: 0 }}>
                <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Playlists</Text>
              </div>
              <div style={{ width: '120px', flexShrink: 0 }} />
            </Flex>
          </div>
        )}

        {friendsLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={`skeleton-${index}`} style={{ padding: '14px 20px', borderBottom: index < 3 ? '1px solid rgba(56, 189, 248, 0.05)' : 'none' }}>
              <Skeleton.Input active style={{ width: '100%', height: '36px', borderRadius: '8px' }} />
            </div>
          ))
        ) : people.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <Empty
              image={<Users style={{ width: '48px', height: '48px', color: SL.muted, opacity: 0.5 }} />}
              description={
                <Text style={{ color: SL.muted, fontSize: '13px' }}>
                  No friends yet. Expand Add New Friend to send an invite.
                </Text>
              }
            />
          </div>
        ) : (
          people.map((person, index) => {
            const initials = person.email.charAt(0).toUpperCase()
            const isPending = person.status === 'pending'
            return (
              <div
                key={personKey(person)}
                style={{
                  padding: isCompact ? '16px' : '16px 20px',
                  borderBottom: index < people.length - 1 ? '1px solid rgba(56, 189, 248, 0.05)' : 'none',
                }}
              >
                {isCompact ? (
                  <Flex vertical gap={12}>
                    <Flex align="center" justify="space-between" gap={12}>
                      <Flex align="center" gap={12} style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '12px',
                          background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '16px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0,
                        }}>
                          {initials}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <Text style={{
                            color: '#F1F5F9', fontSize: '14px', fontWeight: 600,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            display: 'block',
                          }}>
                            {person.email || 'Unknown user'}
                          </Text>
                          {(person.connectedPlatforms?.length ?? 0) > 0 && (
                            <div style={{ marginTop: 6 }}>
                              <ConnectedPlatformIcons platforms={person.connectedPlatforms ?? []} size={12} />
                            </div>
                          )}
                        </div>
                      </Flex>
                      {isPending ? (
                        <Tag style={{
                          margin: 0, flexShrink: 0,
                          background: 'rgba(251, 191, 36, 0.15)',
                          border: '1px solid rgba(251, 191, 36, 0.35)',
                          color: '#FBBF24',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}>
                          Pending
                        </Tag>
                      ) : (
                        <Text style={{ color: '#94A3B8', fontSize: '13px', flexShrink: 0 }}>Active</Text>
                      )}
                    </Flex>

                    <div>
                      <Text style={{
                        color: '#64748B', fontSize: '11px', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        display: 'block', marginBottom: '8px',
                      }}>
                        Playlists
                      </Text>
                      <PlaylistShareSelect
                        person={person}
                        lists={ownedLists}
                        onToggle={handleToggleList}
                      />
                    </div>

                    <Popconfirm
                      title="Remove this friend?"
                      description="They will lose access to every list you shared."
                      okText="Remove"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => void handleRemove(person)}
                    >
                      <Button
                        block
                        icon={<DeleteOutlined />}
                        loading={removingKey === personKey(person)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#EF4444',
                          borderRadius: '8px',
                          height: '36px',
                          fontWeight: 600,
                          fontSize: '13px',
                        }}
                      >
                        Remove
                      </Button>
                    </Popconfirm>
                  </Flex>
                ) : (
                  <Flex align="center">
                    <Flex align="center" gap={12} style={{ flex: '1 1 32%', paddingRight: '16px', minWidth: 0 }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0,
                      }}>
                        {initials}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Text style={{
                          color: '#F1F5F9', fontSize: '14px', fontWeight: 600,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          display: 'block',
                        }}>
                          {person.email || 'Unknown user'}
                        </Text>
                        {(person.connectedPlatforms?.length ?? 0) > 0 && (
                          <div style={{ marginTop: 6 }}>
                            <ConnectedPlatformIcons platforms={person.connectedPlatforms ?? []} size={12} />
                          </div>
                        )}
                      </div>
                    </Flex>

                    <div style={{ width: '110px', paddingRight: '16px', flexShrink: 0 }}>
                      {isPending ? (
                        <Tag style={{
                          margin: 0,
                          background: 'rgba(251, 191, 36, 0.15)',
                          border: '1px solid rgba(251, 191, 36, 0.35)',
                          color: '#FBBF24',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}>
                          Pending
                        </Tag>
                      ) : (
                        <Text style={{ color: '#94A3B8', fontSize: '13px' }}>Active</Text>
                      )}
                    </div>

                    <div style={{ flex: '1 1 38%', paddingRight: '16px', minWidth: 0 }}>
                      <PlaylistShareSelect
                        person={person}
                        lists={ownedLists}
                        onToggle={handleToggleList}
                      />
                    </div>

                    <div style={{ width: '120px', flexShrink: 0 }}>
                      <Popconfirm
                        title="Remove this friend?"
                        description="They will lose access to every list you shared."
                        okText="Remove"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => void handleRemove(person)}
                      >
                        <Button
                          size="small"
                          icon={<DeleteOutlined />}
                          loading={removingKey === personKey(person)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#EF4444',
                            borderRadius: '8px',
                            height: '32px',
                            padding: '0 12px',
                            fontWeight: 600,
                            fontSize: '13px',
                          }}
                        >
                          Remove
                        </Button>
                      </Popconfirm>
                    </div>
                  </Flex>
                )}
              </div>
            )
          })
        )}
      </Card>
      </Flex>
    </div>
  )

  const requestActions = (request: IncomingShareRequest) => {
    const busy = actingId === request.id
    return (
      <Flex gap={8} justify="flex-end">
        <Button
          type="text"
          shape="circle"
          aria-label={`Accept request from ${request.inviterEmail}`}
          icon={<CheckOutlined />}
          loading={busy}
          onClick={() => void handleAcceptRequest(request)}
          style={{
            color: SL.mint,
            background: 'rgba(74, 222, 128, 0.12)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            width: '36px',
            height: '36px',
          }}
        />
        <Button
          type="text"
          shape="circle"
          aria-label={`Reject request from ${request.inviterEmail}`}
          icon={<CloseOutlined />}
          loading={busy}
          onClick={() => void handleRejectRequest(request)}
          style={{
            color: '#EF4444',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            width: '36px',
            height: '36px',
          }}
        />
      </Flex>
    )
  }

  const pendingRequestsTab = (
    <div style={{ paddingTop: '8px' }}>
      <Card
        style={{
          background: 'rgba(28, 31, 33, 0.4)',
          border: '1px solid rgba(56, 189, 248, 0.1)',
          borderRadius: '16px',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: 0 } }}
      >
        {!isCompact && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(56, 189, 248, 0.1)', background: 'rgba(17, 19, 20, 0.4)' }}>
            <Flex>
              <div style={{ flex: '1 1 34%', paddingRight: '16px' }}>
                <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>From</Text>
              </div>
              <div style={{ width: '140px', paddingRight: '16px', flexShrink: 0 }}>
                <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Requested</Text>
              </div>
              <div style={{ flex: '1 1 34%', paddingRight: '16px', minWidth: 0 }}>
                <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ShareList</Text>
              </div>
              <div style={{ width: '96px', flexShrink: 0 }} />
            </Flex>
          </div>
        )}

        {friendsLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={`pending-skeleton-${index}`} style={{ padding: '14px 20px', borderBottom: index < 3 ? '1px solid rgba(56, 189, 248, 0.05)' : 'none' }}>
              <Skeleton.Input active style={{ width: '100%', height: '36px', borderRadius: '8px' }} />
            </div>
          ))
        ) : incoming.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <Empty
              image={<Users style={{ width: '48px', height: '48px', color: SL.muted, opacity: 0.5 }} />}
              description={
                <Text style={{ color: SL.muted, fontSize: '13px' }}>
                  No pending requests. When someone shares a list with you, it will show up here.
                </Text>
              }
            />
          </div>
        ) : (
          incoming.map((request, index) => {
            const initials = request.inviterEmail.charAt(0).toUpperCase()
            return (
              <div
                key={request.id}
                style={{
                  padding: isCompact ? '16px' : '16px 20px',
                  borderBottom: index < incoming.length - 1 ? '1px solid rgba(56, 189, 248, 0.05)' : 'none',
                }}
              >
                {isCompact ? (
                  <Flex vertical gap={12}>
                    <Flex align="center" justify="space-between" gap={12}>
                      <Flex align="center" gap={12} style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '12px',
                          background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '16px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0,
                        }}>
                          {initials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <Text style={{
                            color: '#F1F5F9', fontSize: '14px', fontWeight: 600,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            display: 'block',
                          }}>
                            {request.inviterEmail || 'Unknown user'}
                          </Text>
                          <Text style={{ color: '#64748B', fontSize: '12px' }}>
                            {formatRequestedAt(request.requestedAt)}
                          </Text>
                        </div>
                      </Flex>
                      {requestActions(request)}
                    </Flex>
                    <Text style={{ color: '#F1F5F9', fontSize: '13px', fontWeight: 500 }}>
                      {request.sharelistName}
                    </Text>
                  </Flex>
                ) : (
                  <Flex align="center">
                    <Flex align="center" gap={12} style={{ flex: '1 1 34%', paddingRight: '16px', minWidth: 0 }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0,
                      }}>
                        {initials}
                      </div>
                      <Text style={{
                        color: '#F1F5F9', fontSize: '14px', fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {request.inviterEmail || 'Unknown user'}
                      </Text>
                    </Flex>
                    <div style={{ width: '140px', paddingRight: '16px', flexShrink: 0 }}>
                      <Text style={{ color: '#94A3B8', fontSize: '13px' }}>
                        {formatRequestedAt(request.requestedAt)}
                      </Text>
                    </div>
                    <div style={{ flex: '1 1 34%', paddingRight: '16px', minWidth: 0 }}>
                      <Text style={{
                        color: '#F1F5F9', fontSize: '14px', fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'block',
                      }}>
                        {request.sharelistName}
                      </Text>
                    </div>
                    <div style={{ width: '96px', flexShrink: 0 }}>
                      {requestActions(request)}
                    </div>
                  </Flex>
                )}
              </div>
            )
          })
        )}
      </Card>
    </div>
  )

  return (
    <Content>
      {contextHolder}
      <Title level={1} style={{ color: SL.text, margin: '0 0 20px', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
        Friends
      </Title>
      <Tabs
        activeKey={activeTab}
        onChange={key => setSearchParams(key === 'my-friends' ? {} : { tab: key })}
        items={[
          { key: 'my-friends', label: 'My Friends', children: myFriendsTab },
          { key: 'pending', label: 'Pending Requests', children: pendingRequestsTab },
        ]}
      />
    </Content>
  )
}
