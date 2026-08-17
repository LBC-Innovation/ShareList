import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Card, Flex, Skeleton, Typography, notification } from 'antd'
import { PlaylistHero } from '../components/PlaylistHero'
import { SyncStatusBar } from '../components/SyncStatusBar'
import { TrackList, SHUFFLE_MOVE_MS } from '../components/TrackList'
import { LaunchStreamingFAB } from '../components/LaunchStreamingFAB'
import { LinkPlaylistModal } from '../components/LinkPlaylistModal'
import type { Track } from '../components/TrackList'
import * as api from '../lib/api'
import type { ShareListDetail } from '../lib/api'
import { notifyApiFailure, notifyShareListWarnings } from '../lib/notify'

const { Content } = Layout
const { Text } = Typography

/** Format milliseconds → "m:ss" */
function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function shuffleTracks(list: Track[]): Track[] {
  const next = [...list]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = next[i]
    const swap = next[j]
    if (current === undefined || swap === undefined) continue
    next[i] = swap
    next[j] = current
  }
  return next
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function mapSharelistTracks(sharelist: ShareListDetail | null): Track[] {
  const tracks: Track[] = []
  const seen = new Set<string>()
  for (const t of sharelist?.tracks ?? []) {
    const key = `${t.provider ?? ''}::${t.id}`
    if (seen.has(key)) continue
    seen.add(key)
    tracks.push({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: formatDuration(t.durationMs),
      albumArt: t.imageUrl,
      platform: t.provider as Track['platform'] | undefined,
    })
  }
  return tracks
}

export function PlaylistView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [notifyApi, contextHolder] = notification.useNotification()

  const [sharelist, setSharelist]         = useState<ShareListDetail | null>(null)
  const [isLoading, setLoading]           = useState(true)
  const [syncing, setSyncing]             = useState(false)
  const [crossSyncing, setCrossSyncing]   = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [displayTracks, setDisplayTracks] = useState<Track[]>([])
  const [shuffling, setShuffling]         = useState(false)
  const [shuffleFrom, setShuffleFrom]     = useState<Track[] | null>(null)

  const loadShareList = async () => {
    if (!id) return
    setLoading(true)
    const result = await api.getShareList(id)
    setLoading(false)
    if (api.isError(result)) {
      setError(result.error.message)
      notifyApiFailure(notifyApi, 'Failed to load ShareList', result)
      return
    }
    setSharelist(result.data)
    notifyShareListWarnings(notifyApi, result.data.warnings)
  }

  const runSyncLists = async (): Promise<api.CrossSyncResult | null> => {
    if (!id) return null
    setCrossSyncing(true)
    try {
      const result = await api.crossSyncShareList(id)
      if (api.isError(result)) {
        notifyApiFailure(notifyApi, 'Sync Lists failed', result)
        return null
      }
      return result.data
    } finally {
      setCrossSyncing(false)
    }
  }

  const reportSyncLists = (data: api.CrossSyncResult) => {
    const { totalAdded, links } = data
    const linkErrors = links.filter(l => l.error)

    if (totalAdded === 0 && linkErrors.length > 0) {
      notifyApi.error({
        message: 'Sync Lists failed',
        description: linkErrors.map(l => `${l.playlistName}: ${l.error}`).join('\n'),
        placement: 'topRight',
        duration: 10,
      })
      return
    }
    if (totalAdded === 0) {
      notifyApi.info({
        message: 'Already up to date',
        description: 'All linked playlists already share the same tracks.',
        placement: 'topRight',
      })
      return
    }
    const details = links
      .filter(l => l.tracksAdded > 0)
      .map(l => `${l.tracksAdded} track${l.tracksAdded === 1 ? '' : 's'} → ${l.playlistName}`)
      .join('\n')
    notifyApi.success({
      message: `Sync Lists complete — ${totalAdded} track${totalAdded === 1 ? '' : 's'} added`,
      description: details || undefined,
      placement: 'topRight',
    })
  }

  const handleCrossSync = async () => {
    const data = await runSyncLists()
    if (!data) return
    reportSyncLists(data)
    void loadShareList()
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleSync = async () => {
    if (!id) return
    setSyncing(true)
    const result = await api.syncShareList(id)
    setSyncing(false)
    if (api.isError(result)) {
      notifyApiFailure(notifyApi, 'Fetch Songs failed', result)
      return
    }
    setSharelist(result.data)
    notifyShareListWarnings(notifyApi, result.data.warnings)
  }

  useEffect(() => {
    void loadShareList()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDisplayTracks(mapSharelistTracks(sharelist))
  }, [sharelist])

  const handleShuffle = async () => {
    if (!id || shuffling || displayTracks.length < 2) return
    setShuffleFrom(displayTracks)
    setShuffling(true)
    const latest = shuffleTracks(displayTracks)
    setDisplayTracks(latest)
    try {
      const [result] = await Promise.all([
        api.shuffleShareList(id, latest.map(track => track.id)),
        wait(SHUFFLE_MOVE_MS),
      ])
      if (api.isError(result)) {
        notifyApiFailure(notifyApi, 'Shuffle synced locally, but remote playlists were not updated', result)
        return
      }

      const linkErrors = result.data.links.filter(link => link.error)
      if (linkErrors.length > 0 && result.data.totalWritten === 0) {
        notifyApi.error({
          message: 'Could not update linked playlists',
          description: linkErrors.map(link => `${link.playlistName}: ${link.error}`).join('\n'),
          placement: 'topRight',
          duration: 8,
        })
      } else if (linkErrors.length > 0) {
        notifyApi.warning({
          message: 'Shuffled, with some playlist updates skipped',
          description: linkErrors.map(link => `${link.playlistName}: ${link.error}`).join('\n'),
          placement: 'topRight',
          duration: 8,
        })
      } else {
        notifyApi.success({
          message: 'Shuffled',
          description: 'Linked playlists were updated with the new order.',
          placement: 'topRight',
        })
      }
    } finally {
      setShuffling(false)
      setShuffleFrom(null)
    }
  }

  if (!id) {
    navigate('/')
    return null
  }

  const primaryLink = sharelist?.links.find(l => l.isPrimary) ?? sharelist?.links[0] ?? null

  const membersById = new Map((sharelist?.members ?? []).map(member => [member.id, member]))
  const heroLinks = (sharelist?.links ?? []).map(l => {
    const member = l.userId ? membersById.get(l.userId) : undefined
    return {
      provider: l.provider,
      playlistName: l.playlistName,
      imageUrl: l.imageUrl,
      contributor: member
        ? { displayName: member.displayName, avatarUrl: member.avatarUrl }
        : undefined,
    }
  })

  return (
    <Content>
      {contextHolder}

      {/* Error state */}
      {error && (
        <Card
          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', marginBottom: '16px' }}
          styles={{ body: { padding: '20px' } }}
        >
          <Text style={{ color: '#EF4444' }}>Failed to load ShareList: {error}</Text>
        </Card>
      )}

      <div style={{ marginBottom: '16px' }}>
        <PlaylistHero
          name={sharelist?.name ?? ''}
          trackCount={displayTracks.length}
          links={heroLinks}
          isLoading={isLoading}
          ownerEmail={sharelist?.ownerEmail}
          createdAt={sharelist?.createdAt}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <SyncStatusBar
          isLoading={isLoading}
          syncing={syncing}
          crossSyncing={crossSyncing}
          onSync={() => { void handleSync() }}
          onCrossSync={() => { void handleCrossSync() }}
          onManageList={() => setShowLinkModal(true)}
        />
      </div>

      {isLoading ? (
        <Card
          style={{ background: 'rgba(28, 31, 33, 0.4)', border: '1px solid rgba(56, 189, 248, 0.1)', borderRadius: '16px', backdropFilter: 'blur(20px)', overflow: 'hidden' }}
          styles={{ body: { padding: '16px' } }}
        >
          <Flex vertical gap={12}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Flex key={i} align="center" gap={12}>
                <Skeleton.Avatar active size={48} style={{ borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)' }} />
                <Skeleton.Input active size="small" style={{ flex: 1, width: '100%', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px' }} />
              </Flex>
            ))}
          </Flex>
        </Card>
      ) : (
        !error && displayTracks.length === 0 ? (
          <Card
            style={{ background: 'rgba(28, 31, 33, 0.4)', border: '1px solid rgba(56, 189, 248, 0.1)', borderRadius: '16px', textAlign: 'center' }}
            styles={{ body: { padding: '48px 20px' } }}
          >
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎵</div>
            <Text style={{ color: '#64748B', fontSize: '14px' }}>
              {sharelist?.warnings?.length
                ? sharelist.warnings[0]
                : 'No tracks found for this playlist.'}
            </Text>
          </Card>
        ) : (
          <TrackList
            tracks={displayTracks}
            shuffling={shuffling}
            shuffleFrom={shuffleFrom}
            onShuffle={() => void handleShuffle()}
          />
        )
      )}

      <LaunchStreamingFAB externalUrl={primaryLink?.externalUrl} />

      {showLinkModal && sharelist && (
        <LinkPlaylistModal
          sharelistId={sharelist.id}
          name={sharelist.name}
          links={sharelist.links}
          isOwner={!sharelist.isShared}
          onClose={() => setShowLinkModal(false)}
          onRenamed={nextName => {
            setSharelist(current => current ? { ...current, name: nextName } : current)
          }}
          onLinked={() => {
            setShowLinkModal(false)
            notifyApi.success({ message: 'Playlist linked!', placement: 'topRight' })
            void loadShareList()
          }}
          onUnlinked={() => {
            void loadShareList()
          }}
          onDeleted={(result) => {
            setShowLinkModal(false)
            notifyApi.success({
              message: result.left ? 'Left ShareList' : 'ShareList deleted',
              description: result.left
                ? 'Your linked playlists were saved to List Library.'
                : 'Friends who contributed kept their own copies. Streaming playlists were not changed.',
              placement: 'topRight',
            })
            navigate('/')
          }}
        />
      )}
    </Content>
  )
}
