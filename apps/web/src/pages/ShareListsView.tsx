import { useEffect, useMemo, useState } from 'react'
import { Layout, Card, Flex, Typography, Tag, Skeleton } from 'antd'
import { Users } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpotify, faApple } from '@fortawesome/free-brands-svg-icons'
import { useNavigate } from 'react-router-dom'
import * as api from '../lib/api'
import type { ShareListSummary } from '../lib/api'

const { Content } = Layout
const { Text, Title } = Typography

const PROVIDER_ICONS: Record<string, { icon: typeof faSpotify; color: string }> = {
  spotify:     { icon: faSpotify, color: '#1DB954' },
  apple_music: { icon: faApple,   color: '#FA243C' },
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m`
}
// silence unused warning — formatMs used only when we have duration data
void formatMs

/** Returns up to 4 image URLs from the linked playlists for the mosaic. */
function coverImages(list: ShareListSummary): string[] {
  return list.links
    .map(l => l.imageUrl)
    .filter((u): u is string => !!u)
    .slice(0, 4)
}

function ShareListCard({ list, onOpen }: { list: ShareListSummary; onOpen: (id: string) => void }) {
  const images = coverImages(list)
  const platforms = list.links.map(l => l.provider).filter((v, i, a) => a.indexOf(v) === i)
  const shared = !!list.isShared

  return (
    <Card
      hoverable
      onClick={() => onOpen(list.id)}
      style={{
        background: shared ? 'rgba(74, 222, 128, 0.08)' : 'rgba(28, 31, 33, 0.4)',
        border: shared ? '1px solid rgba(74, 222, 128, 0.28)' : '1px solid rgba(56, 189, 248, 0.1)',
        borderRadius: '16px',
        backdropFilter: 'blur(20px)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      styles={{ body: { padding: '16px' } }}
      onMouseEnter={e => {
        e.currentTarget.style.background = shared ? 'rgba(74, 222, 128, 0.14)' : 'rgba(56, 189, 248, 0.08)'
        e.currentTarget.style.borderColor = shared ? 'rgba(74, 222, 128, 0.45)' : 'rgba(56, 189, 248, 0.25)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = shared ? 'rgba(74, 222, 128, 0.08)' : 'rgba(28, 31, 33, 0.4)'
        e.currentTarget.style.borderColor = shared ? 'rgba(74, 222, 128, 0.28)' : 'rgba(56, 189, 248, 0.1)'
      }}
    >
      <Flex gap={12} align="center">
        {/* Mosaic cover */}
        <div style={{
          flexShrink: 0, width: '64px', height: '64px',
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3px',
          borderRadius: '8px', overflow: 'hidden', background: '#1C1F21',
        }}>
          {images.length > 0
            ? images.slice(0, 4).map((img, idx) => (
                <img key={idx} src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ))
            : (
                <div style={{
                  gridColumn: '1 / -1', gridRow: '1 / -1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: shared ? 'rgba(74, 222, 128, 0.12)' : 'rgba(56, 189, 248, 0.1)', fontSize: '24px',
                }}>🎵</div>
              )
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" gap={8} style={{ marginBottom: '4px' }}>
            <Text style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {list.name}
            </Text>
            {shared && (
              <div
                title="Shared with you"
                style={{
                  flexShrink: 0,
                  width: '22px',
                  height: '22px',
                  borderRadius: '999px',
                  background: 'rgba(74, 222, 128, 0.2)',
                  border: '1px solid rgba(74, 222, 128, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users style={{ width: '12px', height: '12px', color: '#4ADE80' }} />
              </div>
            )}
          </Flex>

          <Flex align="center" gap={8} wrap="wrap">
            {platforms.map(platform => {
              const meta = PROVIDER_ICONS[platform]
              if (!meta) return null
              return (
                <div key={platform} style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: `${meta.color}20`, border: `1px solid ${meta.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FontAwesomeIcon icon={meta.icon} style={{ fontSize: '12px', color: meta.color }} />
                </div>
              )
            })}
            {platforms.length === 0 && (
              <Tag style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: '#64748B', fontSize: '10px', margin: 0 }}>
                No platforms
              </Tag>
            )}
            <Text style={{ color: '#64748B', fontSize: '13px' }}>
              {list.links.length} {list.links.length === 1 ? 'linked playlist' : 'linked playlists'}
            </Text>
          </Flex>
        </div>
      </Flex>
    </Card>
  )
}

function ListSection({
  title,
  empty,
  lists,
  onOpen,
}: {
  title: string
  empty: string
  lists: ShareListSummary[]
  onOpen: (id: string) => void
}) {
  return (
    <Flex vertical gap={12}>
      <div>
        <Text style={{
          color: '#64748B',
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          display: 'block',
          marginBottom: '4px',
        }}>
          {title}
        </Text>
        <Text style={{ color: '#94A3B8', fontSize: '13px' }}>
          {lists.length} {lists.length === 1 ? 'list' : 'lists'}
        </Text>
      </div>
      {lists.length === 0 ? (
        <Card
          style={{
            background: 'rgba(28, 31, 33, 0.4)',
            border: '1px solid rgba(56, 189, 248, 0.1)',
            borderRadius: '16px',
            backdropFilter: 'blur(20px)',
          }}
          styles={{ body: { padding: '20px' } }}
        >
          <Text style={{ color: '#64748B', fontSize: '13px', lineHeight: 1.6 }}>{empty}</Text>
        </Card>
      ) : (
        lists.map(list => (
          <ShareListCard key={list.id} list={list} onOpen={onOpen} />
        ))
      )}
    </Flex>
  )
}

export function ShareListsView() {
  const navigate = useNavigate()
  const [lists, setLists]       = useState<ShareListSummary[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const result = await api.listShareLists()
      setLoading(false)
      if (api.isError(result)) { setError(result.error.message); return }
      setLists(result.data)
    })()
  }, [])

  const created = useMemo(() => lists.filter(list => !list.isShared), [lists])
  const invited = useMemo(() => lists.filter(list => !!list.isShared), [lists])

  return (
    <Content style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px 28px', width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={1} style={{ color: '#F1F5F9', margin: '0 0 4px', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
          List Library
        </Title>
        {!isLoading && !error && (
          <Text style={{ color: '#94A3B8', fontSize: '14px' }}>
            {lists.length} {lists.length === 1 ? 'playlist' : 'playlists'}
          </Text>
        )}
      </div>

      {/* Error */}
      {error && (
        <Card style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px' }}
              styles={{ body: { padding: '20px' } }}>
          <Text style={{ color: '#EF4444' }}>Failed to load ShareLists: {error}</Text>
        </Card>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <Flex vertical gap={12}>
          {[1, 2, 3].map(i => (
            <Card key={i} style={{ background: 'rgba(28, 31, 33, 0.4)', border: '1px solid rgba(56, 189, 248, 0.1)', borderRadius: '16px' }}
                  styles={{ body: { padding: '16px' } }}>
              <Skeleton.Input active style={{ width: '100%', height: '64px', borderRadius: '10px' }} />
            </Card>
          ))}
        </Flex>
      )}

      {!isLoading && !error && (
        <Flex vertical gap={28}>
          <ListSection
            title="Lists you've created"
            empty="Tap Create below to link your first playlist and start sharing."
            lists={created}
            onOpen={id => navigate(`/list/${id}`)}
          />
          <ListSection
            title="Lists you've been invited to"
            empty="When a friend shares a list with you, it will show up here."
            lists={invited}
            onOpen={id => navigate(`/list/${id}`)}
          />
        </Flex>
      )}
    </Content>
  )
}
