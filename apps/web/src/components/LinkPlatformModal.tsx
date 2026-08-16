/**
 * LinkPlatformModal
 *
 * Entry-point modal for linking a streaming service, triggered from the
 * LaunchStreamingFAB or the SyncStatusBar "Manage" button on the main view.
 *
 * Two steps:
 *   'pick'    — lists all available providers with their connection status.
 *               Connected providers show a "Connected" badge; unconnected
 *               ones show a "Connect" button that advances to step 'connect'.
 *
 *   'connect' — per-provider auth view:
 *               • Spotify  → fetches auth URL, navigates browser (OAuth redirect)
 *               • Apple Music → loads MusicKit JS inline, runs authorize(),
 *                 POSTs Music User Token to API, shows success state
 */

import { useState, useEffect, useCallback } from 'react'
import { Modal, Button, Typography, Flex, Tag, Alert, Spin } from 'antd'
import {
  ArrowLeftOutlined,
  CheckOutlined,
  LinkOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import * as api from '../lib/api'
import type { StreamingProvider, ConnectedService } from '../lib/api'

const { Text, Title } = Typography

// ── Design tokens ─────────────────────────────────────────────────────────────
const SL = {
  text: '#F1F5F9',
  muted: '#64748B',
  mint: '#4ADE80',
  border: 'rgba(56, 189, 248, 0.1)',
  borderAccent: 'rgba(56, 189, 248, 0.3)',
}

const PROVIDER_META: Record<string, { color: string; icon: string; tagline: string }> = {
  spotify: {
    color: '#1DB954',
    icon: '🎵',
    tagline: 'Connect Spotify to sync your playlists with ShareList.',
  },
  apple_music: {
    color: '#FA243C',
    icon: '🎧',
    tagline: 'Link Apple Music via MusicKit to access your library.',
  },
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'pick' | 'connect'

interface LinkPlatformModalProps {
  onClose: () => void
  /** Called after a successful connection (so parent can refresh data). */
  onConnected?: (provider: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LinkPlatformModal({ onClose, onConnected }: LinkPlatformModalProps) {
  // ── Data ────────────────────────────────────────────────────────────────────
  const [providers, setProviders] = useState<StreamingProvider[]>([])
  const [connected, setConnected] = useState<ConnectedService[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const loadData = useCallback(async () => {
    setDataLoading(true)
    const [provRes, connRes] = await Promise.all([
      api.listStreamingProviders(),
      api.getConnectedServices(),
    ])
    if (!api.isError(provRes)) setProviders(provRes.data)
    if (!api.isError(connRes)) setConnected(connRes.data)
    setDataLoading(false)
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('pick')
  const [activeProvider, setActiveProvider] = useState<StreamingProvider | null>(null)

  // ── Connect-step state ──────────────────────────────────────────────────────
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [connectSuccess, setConnectSuccess] = useState(false)

  const isConnected = (name: string) => connected.some(c => c.provider === name)

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openConnectStep = (provider: StreamingProvider) => {
    setActiveProvider(provider)
    setConnectError(null)
    setConnectSuccess(false)
    setStep('connect')
  }

  const backToPick = () => {
    setStep('pick')
    setActiveProvider(null)
    setConnectError(null)
  }

  const handleConnect = async () => {
    if (!activeProvider) return
    setIsConnecting(true)
    setConnectError(null)

    try {
      const urlRes = await api.getStreamingAuthUrl(activeProvider.name)
      if (api.isError(urlRes)) {
        setConnectError(urlRes.error.message)
        return
      }

      const { url } = urlRes.data

      // ── Spotify: redirect-based OAuth ──────────────────────────────────────
      if (activeProvider.name === 'spotify') {
        window.location.href = url   // browser leaves page; callback redirects back
        return
      }

      // ── Apple Music: MusicKit JS in-page flow ──────────────────────────────
      if (activeProvider.name === 'apple_music') {
        let sentinel: { url: string; state: string; developerToken: string }
        try {
          sentinel = JSON.parse(url) as typeof sentinel
        } catch {
          setConnectError('Unexpected auth response from server.')
          return
        }

        if (sentinel.url !== 'apple-music://authorize') {
          setConnectError('Unexpected auth URL from server.')
          return
        }

        if (!window.MusicKit) {
          await loadMusicKitScript()
        }

        if (!window.MusicKit) {
          setConnectError('MusicKit JS failed to load. Check your internet connection.')
          return
        }

        const music = window.MusicKit.configure({
          developerToken: sentinel.developerToken,
          app: { name: 'ShareList', build: '1.0' },
        })

        let musicUserToken: string
        try {
          musicUserToken = await music.authorize()
        } catch {
          setConnectError('Apple Music authorization was cancelled or denied.')
          return
        }

        const callbackRes = await api.submitAppleMusicToken(musicUserToken, sentinel.state)
        if (api.isError(callbackRes)) {
          setConnectError(callbackRes.error.message)
          return
        }

        setConnectSuccess(true)
        onConnected?.(activeProvider.name)

        // Return to picker after 1.5 s so user sees success state
        setTimeout(() => {
          void loadData()
          setStep('pick')
          setActiveProvider(null)
          setConnectSuccess(false)
        }, 1500)
      }
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setIsConnecting(false)
    }
  }

  // ── Render helpers ──────────────────────────────────────────────────────────

  const meta = activeProvider ? (PROVIDER_META[activeProvider.name] ?? { color: '#38BDF8', icon: '🎵', tagline: '' }) : null

  const modalTitle =
    step === 'pick'
      ? 'Link a Music Service'
      : `Connect ${activeProvider?.displayName ?? ''}`

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={440}
      style={{ padding: 0 }}
      styles={{
        container: {
          background: 'rgba(17, 19, 20, 0.98)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          borderRadius: '16px',
          padding: 0,
          overflow: 'hidden',
        },
        body: { padding: 0, margin: 0 },
        mask: { backdropFilter: 'blur(3px)', background: 'rgba(0, 0, 0, 0.4)' },
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: '18px 20px',
        borderBottom: `1px solid ${SL.border}`,
        background: step === 'connect' && meta
          ? `linear-gradient(135deg, ${meta.color}14 0%, transparent 60%)`
          : 'rgba(17, 19, 20, 0.6)',
      }}>
        <Flex align="center" gap={10}>
          {step === 'connect' && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={backToPick}
              disabled={isConnecting}
              style={{ color: SL.muted, padding: '0 6px', height: '32px', borderRadius: '8px' }}
            />
          )}
          {step === 'connect' && meta && (
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: `${meta.color}1A`,
              border: `1px solid ${meta.color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}>
              {meta.icon}
            </div>
          )}
          <Title level={5} style={{ color: SL.text, margin: 0, fontSize: '15px', fontWeight: 700 }}>
            {modalTitle}
          </Title>
        </Flex>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '16px 20px 20px' }}>

        {/* ────────────────── STEP: PICK ────────────────── */}
        {step === 'pick' && (
          dataLoading ? (
            <Flex justify="center" align="center" style={{ padding: '32px 0' }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: '#38BDF8' }} spin />} />
            </Flex>
          ) : providers.length === 0 ? (
            <Text style={{ color: SL.muted, fontSize: '14px', display: 'block', textAlign: 'center', padding: '24px 0' }}>
              No streaming services available.
            </Text>
          ) : (
            <Flex vertical gap={10}>
              {providers.map(provider => {
                const m = PROVIDER_META[provider.name] ?? { color: '#38BDF8', icon: '🎵', tagline: '' }
                const linked = isConnected(provider.name)

                return (
                  <div
                    key={provider.name}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: 'rgba(28, 31, 33, 0.5)',
                      border: linked
                        ? `1px solid rgba(74, 222, 128, 0.2)`
                        : `1px solid rgba(255,255,255,0.06)`,
                    }}
                  >
                    <Flex align="center" justify="space-between" gap={12}>
                      <Flex align="center" gap={12}>
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '11px', flexShrink: 0,
                          background: `${m.color}18`,
                          border: `1px solid ${m.color}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '20px',
                        }}>
                          {m.icon}
                        </div>
                        <div>
                          <Text style={{ color: SL.text, fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                            {provider.displayName}
                          </Text>
                          {linked ? (
                            <Tag
                              icon={<CheckOutlined />}
                              style={{
                                background: 'rgba(74, 222, 128, 0.12)',
                                border: '1px solid rgba(74, 222, 128, 0.3)',
                                color: SL.mint,
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '1px 7px',
                                margin: 0,
                                lineHeight: '18px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              Connected
                            </Tag>
                          ) : (
                            <Text style={{ color: SL.muted, fontSize: '12px' }}>Not connected</Text>
                          )}
                        </div>
                      </Flex>

                      {!linked && (
                        <Button
                          size="small"
                          icon={<LinkOutlined />}
                          onClick={() => openConnectStep(provider)}
                          style={{
                            background: `${m.color}18`,
                            border: `1px solid ${m.color}40`,
                            color: m.color,
                            borderRadius: '8px',
                            height: '32px',
                            padding: '0 14px',
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
              })}
            </Flex>
          )
        )}

        {/* ────────────────── STEP: CONNECT ────────────────── */}
        {step === 'connect' && activeProvider && meta && (
          <Flex vertical gap={14}>
            {connectSuccess ? (
              <Flex vertical align="center" gap={12} style={{ padding: '20px 0', textAlign: 'center' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px',
                  background: 'rgba(74, 222, 128, 0.12)',
                  border: '1px solid rgba(74, 222, 128, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px',
                }}>
                  ✓
                </div>
                <div>
                  <Text style={{ color: SL.text, fontSize: '15px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    {activeProvider.displayName} connected!
                  </Text>
                  <Text style={{ color: SL.muted, fontSize: '13px' }}>
                    Your playlists are now available in ShareList.
                  </Text>
                </div>
              </Flex>
            ) : (
              <>
                <Text style={{ color: '#94A3B8', fontSize: '14px', lineHeight: '1.6' }}>
                  {meta.tagline}
                </Text>

                {connectError && (
                  <Alert
                    message={connectError}
                    type="error"
                    showIcon
                    style={{
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  />
                )}

                <Flex gap={10} justify="flex-end" style={{ marginTop: '4px' }}>
                  <Button
                    onClick={backToPick}
                    disabled={isConnecting}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      color: SL.muted,
                      borderRadius: '10px',
                      height: '40px',
                      padding: '0 20px',
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    icon={<LinkOutlined />}
                    loading={isConnecting}
                    onClick={() => void handleConnect()}
                    style={{
                      background: meta.color,
                      border: 'none',
                      color: '#FFFFFF',
                      borderRadius: '10px',
                      height: '40px',
                      padding: '0 22px',
                      fontWeight: 700,
                      fontSize: '14px',
                      boxShadow: `0 4px 14px ${meta.color}44`,
                    }}
                  >
                    Connect {activeProvider.displayName}
                  </Button>
                </Flex>
              </>
            )}
          </Flex>
        )}
      </div>
    </Modal>
  )
}

// ── MusicKit loader ────────────────────────────────────────────────────────────

function loadMusicKitScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('musickit-js')) { resolve(); return }
    const script = document.createElement('script')
    script.id = 'musickit-js'
    script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load MusicKit JS'))
    document.head.appendChild(script)
  })
}
