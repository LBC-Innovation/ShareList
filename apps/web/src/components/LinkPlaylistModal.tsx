/**
 * LinkPlaylistModal — manage playlists linked to an existing ShareList.
 *
 * Tabs:
 *   Add To List — pick a connected service and link a playlist.
 *   Edit List   — unlink an existing linked playlist (confirm via trash).
 *   Delete      — permanently delete the ShareList.
 */

import { useEffect, useState } from 'react'
import { Modal, Select, Button, Typography, Flex, Space, Divider, Spin, Empty, notification, Tabs } from 'antd'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpotify, faApple } from '@fortawesome/free-brands-svg-icons'
import { CheckCircleOutlined, LoadingOutlined, LinkOutlined, DeleteOutlined, ExclamationCircleFilled } from '@ant-design/icons'
import * as api from '../lib/api'
import type { ConnectedService, ShareListLink, StreamingPlaylist } from '../lib/api'
import { notifyApiFailure } from '../lib/notify'

const { Text, Title } = Typography

const SL = {
  bg: '#111314', surface: '#1C1F21', nav: '#161819', border: '#2A2D30',
  accent: '#38BDF8', mint: '#4ADE80', text: '#F1F5F9', muted: '#64748B',
}

const PROVIDER_META: Record<string, { label: string; icon: typeof faSpotify; color: string }> = {
  spotify:     { label: 'Spotify',     icon: faSpotify, color: '#1DB954' },
  apple_music: { label: 'Apple Music', icon: faApple,   color: '#FA243C' },
}

interface LinkPlaylistModalProps {
  sharelistId: string
  links: ShareListLink[]
  isOwner: boolean
  onClose: () => void
  onLinked: () => void
  onUnlinked: () => void
  onDeleted: (result: { deleted: boolean; left: boolean }) => void
}

export function LinkPlaylistModal({ sharelistId, links, isOwner, onClose, onLinked, onUnlinked, onDeleted }: LinkPlaylistModalProps) {
  const [notifyApi, contextHolder] = notification.useNotification()
  const [activeTab, setActiveTab] = useState<'add' | 'edit' | 'delete'>('add')

  const [connected, setConnected]         = useState<ConnectedService[]>([])
  const [servicesLoading, setSvcLoading]  = useState(true)

  const [selectedService, setService]         = useState<string>('')
  const [playlists, setPlaylists]             = useState<StreamingPlaylist[]>([])
  const [playlistsLoading, setPlLoading]      = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('')
  const [linking, setLinking]                 = useState(false)

  const [confirmLinkId, setConfirmLinkId] = useState<string | null>(null)
  const [unlinkingId, setUnlinkingId]     = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  // Load connected services on open
  useEffect(() => {
    void (async () => {
      const result = await api.getConnectedServices()
      setSvcLoading(false)
      if (!api.isError(result)) setConnected(result.data)
    })()
  }, [])

  // Fetch playlists when service changes
  useEffect(() => {
    if (!selectedService) return
    setPlaylists([])
    setSelectedPlaylist('')
    setPlLoading(true)
    void (async () => {
      const result = await api.getStreamingPlaylists(selectedService)
      setPlLoading(false)
      if (api.isError(result)) {
        notifyApiFailure(notifyApi, 'Failed to load playlists', result)
        return
      }
      setPlaylists(result.data)
    })()
  }, [selectedService]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLink = async () => {
    const playlist = playlists.find(p => p.id === selectedPlaylist)
    if (!playlist || !selectedService) return
    setLinking(true)
    try {
      const result = await api.linkPlaylistToShareList(sharelistId, {
        provider: selectedService,
        playlistId: playlist.id,
        playlistName: playlist.name,
        imageUrl: playlist.imageUrl ?? null,
        externalUrl: playlist.externalUrl ?? null,
      })
      if (api.isError(result)) {
        notifyApiFailure(notifyApi, 'Failed to link playlist', result)
        return
      }
      onLinked()
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async (linkId: string) => {
    setUnlinkingId(linkId)
    try {
      const result = await api.unlinkPlaylistFromShareList(sharelistId, linkId)
      if (api.isError(result)) {
        notifyApi.error({ message: 'Failed to unlink playlist', description: result.error.message, placement: 'topRight' })
        return
      }
      setConfirmLinkId(null)
      notifyApi.success({ message: 'Playlist unlinked', placement: 'topRight' })
      onUnlinked()
    } finally {
      setUnlinkingId(null)
    }
  }

  const handleDeleteShareList = async () => {
    setDeleting(true)
    try {
      const result = await api.deleteShareList(sharelistId)
      if (api.isError(result)) {
        notifyApi.error({
          message: isOwner ? 'Failed to delete ShareList' : 'Failed to leave ShareList',
          description: result.error.message,
          placement: 'topRight',
        })
        return
      }
      onDeleted({ deleted: result.data.deleted, left: result.data.left })
    } finally {
      setDeleting(false)
    }
  }

  const handleClose = () => {
    setService('')
    setPlaylists([])
    setSelectedPlaylist('')
    setConfirmLinkId(null)
    setConfirmDelete(false)
    setActiveTab('add')
    onClose()
  }

  const connectedOptions = connected
    .map(svc => {
      const meta = PROVIDER_META[svc.provider]
      if (!meta) return null
      return { value: svc.provider, label: meta.label, icon: meta.icon, color: meta.color }
    })
    .filter(Boolean) as { value: string; label: string; icon: typeof faSpotify; color: string }[]

  const selectedMeta = selectedService ? PROVIDER_META[selectedService] : null

  const addTabContent = (
    <>
      {servicesLoading && (
        <Flex justify="center" style={{ padding: '24px 0' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: SL.accent }} spin />} />
        </Flex>
      )}

      {!servicesLoading && connectedOptions.length === 0 && (
        <Text style={{ color: SL.muted, fontSize: '14px', display: 'block', textAlign: 'center', padding: '24px 0' }}>
          No music services connected. Go to Settings to connect one.
        </Text>
      )}

      {!servicesLoading && connectedOptions.length > 0 && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <Text style={{ color: SL.text, display: 'block', marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>
              Select Music Service
            </Text>
            <Select
              value={selectedService || undefined}
              onChange={v => setService(v as string)}
              placeholder="Choose your music service"
              style={{ width: '100%' }}
              size="large"
              options={connectedOptions.map(opt => ({
                value: opt.value,
                label: (
                  <Flex align="center" gap={10}>
                    <FontAwesomeIcon icon={opt.icon} style={{ fontSize: '18px', color: opt.color }} />
                    <Text style={{ color: SL.text, fontSize: '14px', fontWeight: 500 }}>{opt.label}</Text>
                  </Flex>
                ),
              }))}
            />
          </div>

          {selectedService && (
            <Divider style={{ margin: '20px 0', borderColor: 'rgba(56, 189, 248, 0.1)' }} />
          )}

          {selectedService && playlistsLoading && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Spin size="large" indicator={<LoadingOutlined style={{ fontSize: 36, color: SL.accent }} />} />
              <Text style={{ display: 'block', marginTop: '16px', color: '#94A3B8', fontSize: '14px' }}>
                Loading your {selectedMeta?.label} playlists…
              </Text>
            </div>
          )}

          {selectedService && !playlistsLoading && playlists.length > 0 && (
            <>
              <Flex align="center" gap={8} style={{ marginBottom: '14px' }}>
                <CheckCircleOutlined style={{ fontSize: '16px', color: SL.mint }} />
                <Text style={{ color: SL.mint, fontSize: '13px', fontWeight: 600 }}>
                  Connected to {selectedMeta?.label}
                </Text>
              </Flex>

              <Text style={{ color: SL.text, display: 'block', marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>
                Select a Playlist
              </Text>

              <div style={{ maxHeight: '280px', overflowY: 'auto', background: 'rgba(17, 19, 20, 0.5)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.15)', padding: '8px' }}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {playlists.map(playlist => (
                    <div
                      key={playlist.id}
                      onClick={() => setSelectedPlaylist(playlist.id)}
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
                            <img src={playlist.imageUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <Text style={{ color: SL.text, fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {playlist.name}
                            </Text>
                            <Text style={{ color: SL.muted, fontSize: '12px' }}>
                              {playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'}
                            </Text>
                          </div>
                        </Flex>
                        {selectedPlaylist === playlist.id && (
                          <CheckCircleOutlined style={{ fontSize: '20px', color: SL.accent, marginLeft: '12px', flexShrink: 0 }} />
                        )}
                      </Flex>
                    </div>
                  ))}
                </Space>
              </div>
            </>
          )}

          {selectedService && !playlistsLoading && playlists.length === 0 && (
            <Empty
              description={<Text style={{ color: SL.muted, fontSize: '13px' }}>No playlists found in your {selectedMeta?.label} account</Text>}
              style={{ padding: '32px 20px', background: 'rgba(17, 19, 20, 0.5)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.1)' }}
            />
          )}
        </>
      )}
    </>
  )

  const editTabContent = (
    <>
      {links.length === 0 ? (
        <Empty
          description={<Text style={{ color: SL.muted, fontSize: '13px' }}>No playlists linked to this ShareList yet</Text>}
          style={{ padding: '32px 20px', background: 'rgba(17, 19, 20, 0.5)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.1)' }}
        />
      ) : (
        <>
          <Text style={{ color: SL.text, display: 'block', marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>
            Linked Playlists
          </Text>
          <div style={{
            maxHeight: '280px',
            overflowY: 'auto',
            overflowX: 'hidden',
            background: 'rgba(17, 19, 20, 0.5)',
            borderRadius: '12px',
            border: '1px solid rgba(56, 189, 248, 0.15)',
            padding: '8px',
          }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {links.map(link => {
                const meta = PROVIDER_META[link.provider]
                const linkId = link.id
                const confirming = confirmLinkId === linkId
                const busy = unlinkingId === linkId
                return (
                  <div
                    key={linkId ?? `${link.provider}-${link.playlistId}`}
                    style={{
                      padding: '14px 16px',
                      background: 'rgba(28, 31, 33, 0.6)',
                      border: '1px solid rgba(56, 189, 248, 0.1)',
                      borderRadius: '10px',
                      position: 'relative',
                      zIndex: confirming ? 2 : 1,
                      overflow: 'hidden',
                    }}
                  >
                    <Flex justify="space-between" align="center" gap={12}>
                      <Flex align="center" gap={12} style={{ flex: 1, minWidth: 0 }}>
                        {link.imageUrl ? (
                          <img src={link.imageUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '6px', flexShrink: 0,
                            background: meta?.color ?? SL.border,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {meta && <FontAwesomeIcon icon={meta.icon} style={{ color: '#FFFFFF', fontSize: '14px' }} />}
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <Text style={{ color: SL.text, fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {link.playlistName}
                          </Text>
                          <Text style={{ color: SL.muted, fontSize: '12px' }}>
                            {meta?.label ?? link.provider}{link.isPrimary ? ' · Primary' : ''}
                          </Text>
                        </div>
                      </Flex>
                      {linkId && (
                        confirming ? (
                          <Button
                            size="small"
                            danger
                            loading={busy}
                            icon={!busy ? <ExclamationCircleFilled /> : undefined}
                            onClick={() => void handleUnlink(linkId)}
                            className="sl-unlink-confirm"
                            style={{
                              flexShrink: 0,
                              height: '32px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '12px',
                              background: '#EF4444',
                              borderColor: '#EF4444',
                              color: '#FFFFFF',
                            }}
                          >
                            Click to Confirm
                          </Button>
                        ) : (
                          <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            onClick={() => setConfirmLinkId(linkId)}
                            style={{ color: '#EF4444', flexShrink: 0 }}
                            aria-label={`Unlink ${link.playlistName}`}
                          />
                        )
                      )}
                    </Flex>
                  </div>
                )
              })}
            </Space>
          </div>
        </>
      )}
    </>
  )

  const deleteTabContent = (
    <div>
      <Text style={{ color: SL.text, fontSize: '15px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
        {isOwner ? 'Delete this ShareList' : 'Leave this ShareList'}
      </Text>
      <Text style={{ color: SL.muted, fontSize: '13px', display: 'block', marginBottom: '20px', lineHeight: 1.6 }}>
        {isOwner
          ? 'This removes your ShareList and your linked playlists from ShareList. Friends who contributed keep their own copy of the playlists they linked. Spotify and Apple Music playlists are not changed, and no songs are removed.'
          : 'You will leave this shared list. Your linked playlists become your own ShareList on My Lists. The owner\'s list stays. Spotify and Apple Music playlists are not changed, and no songs are removed.'}
      </Text>
      {confirmDelete ? (
        <Button
          danger
          size="large"
          block
          loading={deleting}
          icon={!deleting ? <ExclamationCircleFilled /> : undefined}
          onClick={() => void handleDeleteShareList()}
          className="sl-unlink-confirm"
          style={{
            height: '44px',
            borderRadius: '10px',
            fontWeight: 700,
            background: '#EF4444',
            borderColor: '#EF4444',
            color: '#FFFFFF',
          }}
        >
          Click to Confirm
        </Button>
      ) : (
        <Button
          danger
          size="large"
          block
          icon={<DeleteOutlined />}
          onClick={() => setConfirmDelete(true)}
          style={{
            height: '44px',
            borderRadius: '10px',
            fontWeight: 700,
            color: '#FFFFFF',
            background: '#EF4444',
            borderColor: '#EF4444',
          }}
        >
          <span style={{ color: '#FFFFFF' }}>{isOwner ? 'Delete ShareList' : 'Leave ShareList'}</span>
        </Button>
      )}
    </div>
  )

  return (
    <>
      {contextHolder}
      <Modal
        open
        onCancel={handleClose}
        footer={null}
        width={560}
        centered
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
          body: { padding: 0, margin: 0, overflow: 'hidden' },
          mask: { backdropFilter: 'blur(3px)', background: 'rgba(0, 0, 0, 0.4)' },
        }}
      >
        <div style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(74, 222, 128, 0.1) 100%)',
          borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        }}>
          <Flex align="center" gap={12}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)',
            }}>
              <LinkOutlined />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: SL.text, fontSize: '18px', fontWeight: 700 }}>
                Manage Playlists
              </Title>
              <Text style={{ color: '#94A3B8', fontSize: '13px' }}>
                Link a new playlist or edit the ones already on this list
              </Text>
            </div>
          </Flex>
        </div>

        <div style={{ padding: '16px 28px 24px', overflow: 'hidden' }}>
          <Tabs
            activeKey={activeTab}
            onChange={key => {
              setActiveTab(key as 'add' | 'edit' | 'delete')
              setConfirmLinkId(null)
              setConfirmDelete(false)
            }}
            items={[
              { key: 'add', label: 'Add To List', children: addTabContent },
              { key: 'edit', label: 'Edit List', children: editTabContent },
              { key: 'delete', label: isOwner ? 'Delete' : 'Leave', children: deleteTabContent },
            ]}
          />
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(56, 189, 248, 0.1)', background: 'rgba(17, 19, 20, 0.5)' }}>
          <Flex gap={12} justify="flex-end">
            <Button
              size="large"
              onClick={handleClose}
              style={{ background: 'transparent', border: '1px solid rgba(148, 163, 184, 0.3)', color: '#94A3B8', borderRadius: '10px', height: '44px', padding: '0 20px', fontWeight: 600 }}
            >
              {activeTab === 'delete' ? 'Cancel' : activeTab === 'edit' ? 'Done' : 'Cancel'}
            </Button>
            {activeTab === 'add' && (
              <Button
                size="large"
                loading={linking}
                disabled={!selectedPlaylist}
                icon={!linking && <LinkOutlined />}
                onClick={() => void handleLink()}
                style={{
                  background: selectedPlaylist ? 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)' : 'rgba(56, 189, 248, 0.1)',
                  border: 'none', borderRadius: '10px', height: '44px', padding: '0 24px',
                  fontSize: '14px', fontWeight: 700,
                  color: selectedPlaylist ? '#FFFFFF' : SL.muted,
                  boxShadow: selectedPlaylist ? '0 4px 16px rgba(56, 189, 248, 0.25)' : 'none',
                  opacity: selectedPlaylist ? 1 : 0.6,
                }}
              >
                {linking ? 'Linking…' : 'Link Playlist'}
              </Button>
            )}
          </Flex>
        </div>
      </Modal>
    </>
  )
}
