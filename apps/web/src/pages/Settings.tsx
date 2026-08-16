/**
 * Settings page — Music Services section.
 *
 * Handles post-OAuth landing: Spotify's authorization code flow redirects the
 * browser back to /settings?connected=spotify (on success) or
 * /settings?error=...&provider=... (on failure).  The page detects these params
 * on mount and shows an appropriate notification.
 */

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Layout, Typography, Card, Flex, Button, Tag, Skeleton, notification, Popconfirm } from 'antd'
import { LinkOutlined, DisconnectOutlined, CheckOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import * as api from '../lib/api'
import type { ConnectedService, StreamingProvider } from '../lib/api'
import { LinkServiceModal } from '../components/LinkServiceModal'

const { Content } = Layout
const { Title, Text } = Typography

// ── Design tokens ─────────────────────────────────────────────────────────────
const SL = {
  bg: '#111314',
  surface: '#1C1F21',
  border: 'rgba(56, 189, 248, 0.1)',
  accent: '#38BDF8',
  mint: '#4ADE80',
  text: '#F1F5F9',
  muted: '#64748B',
}

const PROVIDER_META: Record<string, { color: string; icon: string }> = {
  spotify: { color: '#1DB954', icon: '🎵' },
  apple_music: { color: '#FA243C', icon: '🎧' },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [providers, setProviders] = useState<StreamingProvider[]>([])
  const [connected, setConnected] = useState<ConnectedService[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const [linkProvider, setLinkProvider] = useState<StreamingProvider | null>(null)

  const [notifyApi, contextHolder] = notification.useNotification()

  // ── Load providers + connections ──────────────────────────────────────────

  const load = useCallback(async () => {
    setIsLoading(true)
    const [provResult, connResult] = await Promise.all([
      api.listStreamingProviders(),
      api.getConnectedServices(),
    ])
    setIsLoading(false)

    if (!api.isError(provResult)) setProviders(provResult.data)
    if (!api.isError(connResult)) setConnected(connResult.data)
  }, [])

  useEffect(() => { void load() }, [load])

  // ── Handle post-OAuth redirect params ────────────────────────────────────

  useEffect(() => {
    const connectedProvider = searchParams.get('connected')
    const errorMsg = searchParams.get('error')
    const errorProvider = searchParams.get('provider')

    if (connectedProvider) {
      const name = connectedProvider.charAt(0).toUpperCase() + connectedProvider.slice(1)
      notifyApi.success({
        message: `${name} connected`,
        description: 'Your playlists are now available in ShareList.',
        placement: 'topRight',
        duration: 4,
      })
      // Remove params so a page refresh doesn't re-fire the notification
      setSearchParams({}, { replace: true })
      void load()
    } else if (errorMsg) {
      notifyApi.error({
        message: `Connection failed${errorProvider ? ` (${errorProvider})` : ''}`,
        description: decodeURIComponent(errorMsg),
        placement: 'topRight',
        duration: 6,
      })
      setSearchParams({}, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Disconnect ────────────────────────────────────────────────────────────

  const handleDisconnect = async (providerName: string, displayName: string) => {
    setDisconnecting(providerName)
    try {
      const result = await api.disconnectStreamingService(providerName)
      if (api.isError(result)) {
        notifyApi.error({ message: `Failed to disconnect ${displayName}`, description: result.error.message, placement: 'topRight' })
        return
      }
      setConnected(prev => prev.filter(c => c.provider !== providerName))
      notifyApi.success({ message: `${displayName} disconnected`, placement: 'topRight', duration: 3 })
    } finally {
      setDisconnecting(null)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const isConnected = (providerName: string) =>
    connected.some(c => c.provider === providerName)

  const connectedAt = (providerName: string) => {
    const svc = connected.find(c => c.provider === providerName)
    if (!svc) return null
    return new Date(svc.connectedAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Content style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px 24px' }}>
      {contextHolder}

      <Title
        level={1}
        style={{ color: SL.text, margin: '0 0 28px', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}
      >
        Settings
      </Title>

      {/* Music Services section */}
      <div style={{ marginBottom: '8px' }}>
        <Text style={{ color: SL.muted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Music Services
        </Text>
      </div>

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
        {isLoading ? (
          // Skeleton rows
          [0, 1].map(i => (
            <div
              key={i}
              style={{
                padding: '20px 24px',
                borderBottom: i === 0 ? `1px solid ${SL.border}` : 'none',
              }}
            >
              <Skeleton.Input active style={{ width: '100%', height: '48px', borderRadius: '10px' }} />
            </div>
          ))
        ) : providers.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <ExclamationCircleOutlined style={{ fontSize: '24px', color: SL.muted, marginBottom: '12px' }} />
            <Text style={{ color: SL.muted, display: 'block' }}>No streaming services available</Text>
          </div>
        ) : (
          providers.map((provider, index) => {
            const meta = PROVIDER_META[provider.name] ?? { color: SL.accent, icon: '🎵' }
            const connected_ = isConnected(provider.name)
            const connectedDate = connectedAt(provider.name)

            return (
              <div
                key={provider.name}
                style={{
                  padding: '18px 24px',
                  borderBottom: index < providers.length - 1 ? `1px solid ${SL.border}` : 'none',
                }}
              >
                <Flex align="center" justify="space-between" gap={16}>
                  {/* Provider info */}
                  <Flex align="center" gap={14}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                      background: `${meta.color}18`,
                      border: `1px solid ${meta.color}33`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '22px',
                    }}>
                      {meta.icon}
                    </div>
                    <div>
                      <Text style={{ color: SL.text, fontSize: '15px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                        {provider.displayName}
                      </Text>
                      {connected_ && connectedDate ? (
                        <Flex align="center" gap={6}>
                          <Tag
                            icon={<CheckOutlined />}
                            style={{
                              background: 'rgba(74, 222, 128, 0.12)',
                              border: '1px solid rgba(74, 222, 128, 0.3)',
                              color: SL.mint,
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '1px 8px',
                              margin: 0,
                              lineHeight: '18px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            Connected
                          </Tag>
                          <Text style={{ color: SL.muted, fontSize: '12px' }}>
                            since {connectedDate}
                          </Text>
                        </Flex>
                      ) : (
                        <Text style={{ color: SL.muted, fontSize: '13px' }}>Not connected</Text>
                      )}
                    </div>
                  </Flex>

                  {/* Action button */}
                  {connected_ ? (
                    <Popconfirm
                      title={`Disconnect ${provider.displayName}?`}
                      description="Your playlists from this service will no longer be accessible in ShareList."
                      onConfirm={() => void handleDisconnect(provider.name, provider.displayName)}
                      okText="Disconnect"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        icon={<DisconnectOutlined />}
                        loading={disconnecting === provider.name}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#EF4444',
                          borderRadius: '10px',
                          height: '36px',
                          padding: '0 16px',
                          fontSize: '13px',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        Disconnect
                      </Button>
                    </Popconfirm>
                  ) : (
                    <Button
                      icon={<LinkOutlined />}
                      onClick={() => setLinkProvider(provider)}
                      style={{
                        background: `${meta.color}18`,
                        border: `1px solid ${meta.color}44`,
                        color: meta.color,
                        borderRadius: '10px',
                        height: '36px',
                        padding: '0 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      Connect
                    </Button>
                  )}
                </Flex>
              </div>
            )
          })
        )}
      </Card>

      {/* Link Service modal */}
      {linkProvider && (
        <LinkServiceModal
          provider={linkProvider.name}
          displayName={linkProvider.displayName}
          onClose={() => setLinkProvider(null)}
          onConnected={() => {
            setLinkProvider(null)
            void load()
          }}
        />
      )}
    </Content>
  )
}
