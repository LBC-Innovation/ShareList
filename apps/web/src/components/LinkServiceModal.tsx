/**
 * LinkServiceModal
 *
 * Initiates the OAuth / MusicKit connection flow for a streaming provider.
 *
 * Spotify flow:  fetches auth URL → navigates the browser there → Spotify
 *   redirects back to the API callback → API redirects to /settings?connected=spotify
 *
 * Apple Music flow:  fetches auth URL (contains developerToken + state) →
 *   loads MusicKit JS → prompts user for permission → POSTs Music User Token
 *   back to the API callback → shows success in-modal
 */

import { useState } from 'react'
import { Modal, Button, Typography, Flex, Alert, Space } from 'antd'
import { CheckCircleOutlined, LinkOutlined } from '@ant-design/icons'
import * as api from '../lib/api'

const { Text, Title } = Typography

// ── Design tokens ─────────────────────────────────────────────────────────────
const SL = {
  bg: '#111314',
  surface: '#1C1F21',
  border: 'rgba(56, 189, 248, 0.2)',
  accent: '#38BDF8',
  mint: '#4ADE80',
  text: '#F1F5F9',
  muted: '#64748B',
}

// ── Provider metadata ─────────────────────────────────────────────────────────
const PROVIDER_META: Record<string, { color: string; icon: string; description: string }> = {
  spotify: {
    color: '#1DB954',
    icon: '🎵',
    description: 'Connect your Spotify account to access and share your playlists.',
  },
  apple_music: {
    color: '#FA243C',
    icon: '🎧',
    description: 'Connect Apple Music to access your library playlists via MusicKit.',
  },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LinkServiceModalProps {
  provider: string
  displayName: string
  onClose: () => void
  onConnected: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LinkServiceModal({ provider, displayName, onClose, onConnected }: LinkServiceModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const meta = PROVIDER_META[provider] ?? { color: SL.accent, icon: '🎵', description: '' }

  // ── Spotify: redirect-based OAuth ────────────────────────────────────────────
  const handleSpotifyConnect = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await api.getStreamingAuthUrl('spotify')
      if (api.isError(result)) {
        setError(result.error.message)
        return
      }
      // Navigate the browser — the callback will redirect back to /settings
      window.location.href = result.data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get auth URL')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Apple Music: MusicKit JS in-page flow ────────────────────────────────────
  const handleAppleMusicConnect = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Step 1: get developerToken + state from the API
      const result = await api.getStreamingAuthUrl('apple_music')
      if (api.isError(result)) {
        setError(result.error.message)
        return
      }

      // The auth URL for Apple Music is a JSON sentinel string
      let sentinel: { url: string; state: string; developerToken: string }
      try {
        sentinel = JSON.parse(result.data.url) as typeof sentinel
      } catch {
        setError('Unexpected auth URL format from server')
        return
      }

      if (sentinel.url !== 'apple-music://authorize') {
        setError('Provider returned unexpected auth URL')
        return
      }

      // Step 2: ensure MusicKit JS is loaded
      if (!window.MusicKit) {
        // Dynamically load MusicKit JS if not already present
        await loadMusicKitScript()
      }

      if (!window.MusicKit) {
        setError('MusicKit JS failed to load. Please check your internet connection.')
        return
      }

      // Step 3: configure MusicKit and prompt the user
      const music = window.MusicKit.configure({
        developerToken: sentinel.developerToken,
        app: { name: 'ShareList', build: '1.0' },
      })

      let musicUserToken: string
      try {
        musicUserToken = await music.authorize()
      } catch {
        setError('Apple Music authorization was cancelled or denied.')
        return
      }

      // Step 4: send the Music User Token to our API
      const callbackResult = await api.submitAppleMusicToken(musicUserToken, sentinel.state)
      if (api.isError(callbackResult)) {
        setError(callbackResult.error.message)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onConnected()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apple Music connection failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = provider === 'spotify' ? handleSpotifyConnect : handleAppleMusicConnect

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
          border: `1px solid ${SL.border}`,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          borderRadius: '16px',
          padding: 0,
          overflow: 'hidden',
        },
        body: { padding: 0, margin: 0 },
        mask: { backdropFilter: 'blur(3px)', background: 'rgba(0, 0, 0, 0.4)' },
      }}
    >
      {/* Header stripe */}
      <div style={{
        padding: '20px 24px',
        borderBottom: `1px solid rgba(56, 189, 248, 0.1)`,
        background: `linear-gradient(135deg, ${meta.color}18 0%, transparent 60%)`,
      }}>
        <Flex align="center" gap={14}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: `${meta.color}22`,
            border: `1px solid ${meta.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px',
          }}>
            {meta.icon}
          </div>
          <div>
            <Title level={4} style={{ color: SL.text, margin: 0, fontSize: '16px', fontWeight: 700 }}>
              Connect {displayName}
            </Title>
            <Text style={{ color: SL.muted, fontSize: '13px' }}>
              Link your {displayName} account
            </Text>
          </div>
        </Flex>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px 24px' }}>
        {success ? (
          <Flex vertical align="center" gap={12} style={{ padding: '16px 0', textAlign: 'center' }}>
            <CheckCircleOutlined style={{ fontSize: '40px', color: SL.mint }} />
            <Text style={{ color: SL.text, fontSize: '15px', fontWeight: 600 }}>
              {displayName} connected!
            </Text>
            <Text style={{ color: SL.muted, fontSize: '13px' }}>
              Your playlists are now available in ShareList.
            </Text>
          </Flex>
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Text style={{ color: '#94A3B8', fontSize: '14px', lineHeight: '1.6' }}>
              {meta.description}
            </Text>

            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                style={{
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                }}
              />
            )}

            <Flex gap={12} justify="flex-end">
              <Button
                onClick={onClose}
                disabled={isLoading}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  color: SL.muted,
                  borderRadius: '10px',
                  height: '40px',
                  padding: '0 20px',
                }}
              >
                Cancel
              </Button>
              <Button
                icon={<LinkOutlined />}
                loading={isLoading}
                onClick={handleConnect}
                style={{
                  background: meta.color,
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  height: '40px',
                  padding: '0 20px',
                  fontWeight: 700,
                  fontSize: '14px',
                  boxShadow: `0 4px 16px ${meta.color}44`,
                }}
              >
                Connect {displayName}
              </Button>
            </Flex>
          </Space>
        )}
      </div>
    </Modal>
  )
}

// ── MusicKit script loader ────────────────────────────────────────────────────

function loadMusicKitScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('musickit-js')) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.id = 'musickit-js'
    script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load MusicKit JS'))
    document.head.appendChild(script)
  })
}
