/**
 * CreateShareList — full-page flow for creating a new ShareList.
 *
 * Flow:
 *   1. Load connected services from API.
 *   2. If none connected → show "Connect a service first" prompt.
 *   3. User selects a connected service from dropdown.
 *   4. Fetch user's playlists for that service.
 *   5. User picks a playlist, names the ShareList, and optionally queues friend emails.
 *   6. POST /sharelists, then POST /friends/invites for each queued email → navigate to /list/:id.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout, Typography, Button, Card, Flex, Space, Divider, Select, Spin, Empty, Input, notification } from 'antd'
import {
  CheckCircleOutlined,
  LoadingOutlined,
  LinkOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  CloseOutlined,
  MailOutlined,
} from '@ant-design/icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpotify, faApple } from '@fortawesome/free-brands-svg-icons'
import * as api from '../lib/api'
import { notifyApiFailure } from '../lib/notify'
import { useAuth } from '../context/AuthContext'
import type { ConnectedService, StreamingPlaylist } from '../lib/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function inviteEmailError(email: string, existing: string[], ownEmail?: string | null): string | null {
  if (!email) return 'Enter an email'
  if (!EMAIL_RE.test(email)) return 'Enter a valid email'
  if (ownEmail && email === ownEmail.trim().toLowerCase()) return 'You cannot invite yourself'
  if (existing.includes(email)) return 'That email is already in the list'
  return null
}

const { Content } = Layout
const { Title, Text } = Typography

function ServiceSelectorValue({
  option,
  connected,
}: {
  option: { label: string; icon: typeof faSpotify; color: string }
  connected: boolean
}) {
  return (
    <Flex align="center">
      <span
        className={`sl-service-connected-check${connected ? ' is-in' : ''}`}
        aria-hidden={!connected}
      >
        <CheckCircleOutlined style={{ fontSize: 18, color: '#4ADE80' }} />
      </span>
      <Flex align="center" gap={10}>
        <FontAwesomeIcon icon={option.icon} style={{ fontSize: '18px', color: option.color }} />
        <Text style={{ color: '#F1F5F9', fontSize: '14px', fontWeight: 500 }}>{option.label}</Text>
      </Flex>
    </Flex>
  )
}

// ── Provider metadata ──────────────────────────────────────────────────────────
const PROVIDER_META: Record<string, { label: string; icon: typeof faSpotify; color: string }> = {
  spotify:     { label: 'Spotify',     icon: faSpotify, color: '#1DB954' },
  apple_music: { label: 'Apple Music', icon: faApple,   color: '#FA243C' },
}

export function CreateShareList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [notifyApi, contextHolder] = notification.useNotification()

  // Connected services
  const [connected, setConnected]   = useState<ConnectedService[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)

  // Create flow state
  const [selectedService, setSelectedService]     = useState<string>('')
  const [playlists, setPlaylists]                 = useState<StreamingPlaylist[]>([])
  const [playlistsLoading, setPlaylistsLoading]   = useState(false)
  const [selectedPlaylist, setSelectedPlaylist]   = useState<string>('')
  const [sharelistName, setSharelistName]         = useState('')
  const [inviteEmail, setInviteEmail]             = useState('')
  const [inviteEmails, setInviteEmails]           = useState<string[]>([])
  const [inviteError, setInviteError]             = useState<string | null>(null)
  const [creating, setCreating]                   = useState(false)
  const [serviceReady, setServiceReady]           = useState(false)

  // Load connected services on mount
  useEffect(() => {
    void (async () => {
      const result = await api.getConnectedServices()
      setServicesLoading(false)
      if (!api.isError(result)) setConnected(result.data)
    })()
  }, [])

  // Fetch playlists when service changes
  useEffect(() => {
    if (!selectedService) return
    setPlaylists([])
    setSelectedPlaylist('')
    setSharelistName('')
    setInviteEmail('')
    setInviteEmails([])
    setInviteError(null)
    setServiceReady(false)
    setPlaylistsLoading(true)
    void (async () => {
      const result = await api.getStreamingPlaylists(selectedService)
      setPlaylistsLoading(false)
      if (api.isError(result)) {
        notifyApiFailure(notifyApi, 'Failed to load playlists', result)
        return
      }
      setPlaylists(result.data)
      setServiceReady(true)
    })()
  }, [selectedService]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddInviteEmail = () => {
    if (creating) return
    const email = normalizeEmail(inviteEmail)
    const error = inviteEmailError(email, inviteEmails, user?.email)
    if (error) {
      setInviteError(error)
      return
    }
    setInviteEmails(prev => [...prev, email])
    setInviteEmail('')
    setInviteError(null)
  }

  const handleRemoveInviteEmail = (email: string) => {
    if (creating) return
    setInviteEmails(prev => prev.filter(item => item !== email))
  }

  const handleCreate = async () => {
    const playlist = playlists.find(p => p.id === selectedPlaylist)
    const name = sharelistName.trim()
    if (!playlist || !selectedService || !name) return

    const emailsToInvite = [...inviteEmails]
    const pending = normalizeEmail(inviteEmail)
    if (pending) {
      const error = inviteEmailError(pending, emailsToInvite, user?.email)
      if (error) {
        setInviteError(error)
        return
      }
      emailsToInvite.push(pending)
      setInviteEmails(emailsToInvite)
      setInviteEmail('')
      setInviteError(null)
    }

    setCreating(true)
    try {
      const result = await api.createShareList({
        provider: selectedService,
        playlistId: playlist.id,
        playlistName: playlist.name,
        name,
        imageUrl: playlist.imageUrl ?? null,
        externalUrl: playlist.externalUrl ?? null,
      })
      if (api.isError(result)) {
        notifyApiFailure(notifyApi, 'Failed to create ShareList', result)
        return
      }

      const sharelistId = result.data.id
      let inviteSent: string[] = []
      let inviteFailed: string[] = []
      if (emailsToInvite.length > 0) {
        const inviteResults = await Promise.all(
          emailsToInvite.map(email => api.sendFriendInvite(email, sharelistId)),
        )
        inviteFailed = emailsToInvite.filter((_, index) => api.isError(inviteResults[index]))
        inviteSent = emailsToInvite.filter((_, index) => !api.isError(inviteResults[index]))
      }

      navigate(`/list/${sharelistId}`, {
        state: inviteSent.length > 0 || inviteFailed.length > 0
          ? { inviteSent, inviteFailed }
          : undefined,
      })
    } finally {
      setCreating(false)
    }
  }

  const connectedOptions = connected
    .map(svc => {
      const meta = PROVIDER_META[svc.provider]
      if (!meta) return null
      return { value: svc.provider, label: meta.label, icon: meta.icon, color: meta.color }
    })
    .filter(Boolean) as { value: string; label: string; icon: typeof faSpotify; color: string }[]

  const selectedMeta = selectedService ? PROVIDER_META[selectedService] : null

  return (
    <Content>
      {contextHolder}

      {/* Header */}
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
        {/* Loading services */}
        {servicesLoading && (
          <Flex justify="center" align="center" style={{ padding: '32px 0' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: '#38BDF8' }} spin />} />
          </Flex>
        )}

        {/* No services connected */}
        {!servicesLoading && connectedOptions.length === 0 && (
          <Flex vertical align="center" gap={16} style={{ padding: '16px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '40px' }}>🎵</div>
            <div>
              <Text style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                No music services connected
              </Text>
              <Text style={{ color: '#64748B', fontSize: '13px', lineHeight: '1.6', display: 'block', marginBottom: '20px' }}>
                Connect Spotify or Apple Music in Settings before creating a ShareList.
              </Text>
            </div>
            <Button
              icon={<ArrowRightOutlined />}
              onClick={() => navigate('/settings')}
              style={{
                background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                border: 'none', borderRadius: '10px', height: '44px', padding: '0 24px',
                fontSize: '14px', fontWeight: 700, color: '#FFFFFF',
                boxShadow: '0 4px 16px rgba(56, 189, 248, 0.25)',
              }}
            >
              Go to Settings
            </Button>
          </Flex>
        )}

        {/* Main flow */}
        {!servicesLoading && connectedOptions.length > 0 && (
          <>
            {/* Step 1: Select service */}
            <div style={{ marginBottom: '24px' }}>
              <Text style={{ color: '#F1F5F9', display: 'block', marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>
                Select Music Service
              </Text>
              <Select
                value={selectedService || undefined}
                onChange={v => setSelectedService(v as string)}
                placeholder="Choose your music service"
                className="sl-create-service-select"
                style={{ width: '100%' }}
                size="large"
                labelRender={({ value }) => {
                  const option = connectedOptions.find(opt => opt.value === value)
                  if (!option) return undefined
                  return <ServiceSelectorValue option={option} connected={serviceReady} />
                }}
                options={connectedOptions.map(opt => ({
                  value: opt.value,
                  label: (
                    <Flex align="center" gap={10}>
                      <FontAwesomeIcon icon={opt.icon} style={{ fontSize: '18px', color: opt.color }} />
                      <Text style={{ color: '#F1F5F9', fontSize: '14px', fontWeight: 500 }}>{opt.label}</Text>
                    </Flex>
                  ),
                }))}
              />
            </div>

            {selectedService && (
              <Divider style={{ margin: '24px 0', borderColor: 'rgba(56, 189, 248, 0.1)' }} />
            )}

            {/* Step 2: Loading playlists */}
            {selectedService && playlistsLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" indicator={<LoadingOutlined style={{ fontSize: 36, color: '#38BDF8' }} />} />
                <Text style={{ display: 'block', marginTop: '16px', color: '#94A3B8', fontSize: '14px' }}>
                  Loading your {selectedMeta?.label} playlists…
                </Text>
              </div>
            )}

            {/* Step 3: Select playlist */}
            {selectedService && !playlistsLoading && playlists.length > 0 && (
              <>
                <Text style={{ color: '#F1F5F9', display: 'block', marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>
                  Select a Playlist
                </Text>

                <div style={{
                  maxHeight: '320px',
                  overflowY: 'auto',
                }}>
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {playlists.map(playlist => (
                      <div
                        key={playlist.id}
                        onClick={() => {
                          setSelectedPlaylist(playlist.id)
                          setSharelistName(playlist.name)
                        }}
                        style={{
                          padding: '14px 16px',
                          background: selectedPlaylist === playlist.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(28, 31, 33, 0.6)',
                          border: selectedPlaylist === playlist.id ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(56, 189, 248, 0.1)',
                          borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => { if (selectedPlaylist !== playlist.id) e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)' }}
                        onMouseLeave={e => { if (selectedPlaylist !== playlist.id) e.currentTarget.style.background = 'rgba(28, 31, 33, 0.6)' }}
                      >
                        <Flex justify="space-between" align="center">
                          <Flex align="center" gap={12} style={{ flex: 1, minWidth: 0 }}>
                            {playlist.imageUrl && (
                              <img src={playlist.imageUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <Text style={{ color: '#F1F5F9', fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {playlist.name}
                              </Text>
                              <Text style={{ color: '#64748B', fontSize: '12px' }}>
                                {playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'}
                              </Text>
                            </div>
                          </Flex>
                          {selectedPlaylist === playlist.id && (
                            <CheckCircleOutlined style={{ fontSize: '20px', color: '#38BDF8', marginLeft: '12px', flexShrink: 0 }} />
                          )}
                        </Flex>
                      </div>
                    ))}
                  </Space>
                </div>
              </>
            )}

            {/* No playlists */}
            {selectedService && !playlistsLoading && playlists.length === 0 && (
              <Empty
                description={<Text style={{ color: '#64748B', fontSize: '13px' }}>No playlists found in your {selectedMeta?.label} account</Text>}
                style={{ padding: '40px 20px', background: 'rgba(17, 19, 20, 0.5)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.1)' }}
              />
            )}

            {/* Name + create */}
            {selectedPlaylist && (
              <>
                <Divider style={{ margin: '24px 0', borderColor: 'rgba(56, 189, 248, 0.1)' }} />
                <Text style={{ color: '#F1F5F9', display: 'block', marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>
                  Name
                </Text>
                <Input
                  value={sharelistName}
                  onChange={e => setSharelistName(e.target.value)}
                  onPressEnter={() => { if (sharelistName.trim()) void handleCreate() }}
                  placeholder="Name this ShareList"
                  maxLength={100}
                  size="large"
                  disabled={creating}
                  aria-label="ShareList name"
                  style={{
                    background: 'rgba(17, 19, 20, 0.5)',
                    border: '1px solid rgba(56, 189, 248, 0.15)',
                    borderRadius: '12px',
                    color: '#F1F5F9',
                  }}
                />
                <Text style={{ color: '#64748B', fontSize: '12px', display: 'block', marginTop: '8px', lineHeight: 1.5 }}>
                  Shown as the title of this ShareList. It does not rename the playlist on {selectedMeta?.label ?? 'your music service'}.
                </Text>

                <Text style={{ color: '#F1F5F9', display: 'block', marginTop: '24px', marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>
                  Invite friends
                </Text>
                <Flex gap={8} align="stretch">
                  <Input
                    value={inviteEmail}
                    onChange={e => {
                      setInviteEmail(e.target.value)
                      if (inviteError) setInviteError(null)
                    }}
                    onPressEnter={event => {
                      event.preventDefault()
                      event.stopPropagation()
                      handleAddInviteEmail()
                    }}
                    placeholder="friend@email.com"
                    size="large"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    disabled={creating}
                    prefix={<MailOutlined style={{ color: '#64748B' }} />}
                    aria-label="Friend email"
                    status={inviteError ? 'error' : undefined}
                    style={{
                      flex: 1,
                      background: 'rgba(17, 19, 20, 0.5)',
                      border: '1px solid rgba(56, 189, 248, 0.15)',
                      borderRadius: '12px',
                      color: '#F1F5F9',
                    }}
                  />
                  <Button
                    icon={<PlusOutlined style={{ fontSize: 18 }} />}
                    onClick={handleAddInviteEmail}
                    disabled={creating}
                    aria-label="Add email"
                    style={{
                      width: '60px',
                      height: 'auto',
                      alignSelf: 'stretch',
                      flexShrink: 0,
                      borderRadius: '12px',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      background: 'rgba(56, 189, 248, 0.12)',
                      color: '#38BDF8',
                    }}
                  />
                </Flex>
                {inviteError ? (
                  <Text style={{ color: '#F87171', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                    {inviteError}
                  </Text>
                ) : (
                  <Text style={{ color: '#64748B', fontSize: '12px', display: 'block', marginTop: '8px', lineHeight: 1.5 }}>
                    Optional. We’ll email a join request after this ShareList is created.
                  </Text>
                )}
                {inviteEmails.length > 0 && (
                  <Space direction="vertical" size={8} style={{ width: '100%', marginTop: '12px' }}>
                    {inviteEmails.map(email => (
                      <Flex
                        key={email}
                        align="center"
                        justify="space-between"
                        gap={12}
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(28, 31, 33, 0.6)',
                          border: '1px solid rgba(56, 189, 248, 0.1)',
                          borderRadius: '10px',
                        }}
                      >
                        <Flex align="center" gap={10} style={{ minWidth: 0, flex: 1 }}>
                          <MailOutlined style={{ color: '#38BDF8', flexShrink: 0 }} />
                          <Text
                            style={{
                              color: '#F1F5F9',
                              fontSize: '13px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {email}
                          </Text>
                        </Flex>
                        <Button
                          type="text"
                          size="small"
                          icon={<CloseOutlined />}
                          disabled={creating}
                          onClick={() => handleRemoveInviteEmail(email)}
                          aria-label={`Remove ${email}`}
                          style={{ color: '#64748B', flexShrink: 0 }}
                        />
                      </Flex>
                    ))}
                  </Space>
                )}
                <Button
                  block
                  size="large"
                  loading={creating}
                  disabled={!sharelistName.trim()}
                  onClick={() => void handleCreate()}
                  icon={!creating && <CheckCircleOutlined />}
                  style={{
                    background: sharelistName.trim() ? 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)' : 'rgba(56, 189, 248, 0.1)',
                    border: 'none', borderRadius: '10px', height: '48px',
                    fontSize: '14px', fontWeight: 700,
                    color: sharelistName.trim() ? '#FFFFFF' : '#64748B',
                    boxShadow: sharelistName.trim() ? '0 4px 16px rgba(56, 189, 248, 0.25)' : 'none',
                    marginTop: '20px',
                    opacity: sharelistName.trim() ? 1 : 0.6,
                  }}
                >
                  {creating
                    ? (inviteEmails.length > 0 ? 'Creating and inviting…' : 'Creating…')
                    : 'Create ShareList'}
                </Button>
              </>
            )}
          </>
        )}
      </Card>
    </Content>
  )
}
