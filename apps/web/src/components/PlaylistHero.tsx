import { Card, Flex, Skeleton } from 'antd'
import { LinkOutlined } from '@ant-design/icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpotify, faApple } from '@fortawesome/free-brands-svg-icons'

const PROVIDER_META: Record<string, { label: string; icon: typeof faSpotify; color: string }> = {
  spotify:     { label: 'Spotify',     icon: faSpotify, color: '#1DB954' },
  apple_music: { label: 'Apple Music', icon: faApple,   color: '#FA243C' },
}

interface HeroLink {
  provider: string
  playlistName: string
  imageUrl: string | null
}

interface PlaylistHeroProps {
  name: string
  trackCount: number
  links: HeroLink[]
  onLinkPlatform: () => void
  isLoading?: boolean
}

function formatTrackCount(n: number): string {
  return `${n} ${n === 1 ? 'song' : 'songs'}`
}

export function PlaylistHero({ name, trackCount, links, onLinkPlatform, isLoading = false }: PlaylistHeroProps) {
  const images = links.map(l => l.imageUrl).filter((u): u is string => !!u).slice(0, 4)

  return (
    <Card
      variant="borderless"
      style={{
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(74, 222, 128, 0.1) 50%, rgba(28, 31, 33, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.1)',
      }}
      styles={{ body: { padding: '20px' } }}
    >
      <Flex gap={16} style={{ marginBottom: '20px' }}>
        {/* Mosaic cover */}
        {isLoading ? (
          <Skeleton.Avatar
            active
            size={72}
            shape="square"
            style={{ borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            flexShrink: 0,
            width: '72px',
            height: '72px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '4px',
            borderRadius: '8px',
            overflow: 'hidden',
            background: '#1C1F21',
          }}>
            {images.length > 0
              ? images.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', background: '#1C1F21' }}>
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))
              : (
                  <div style={{
                    gridColumn: '1 / -1', gridRow: '1 / -1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(56, 189, 248, 0.1)', fontSize: '24px',
                  }}>🎵</div>
                )
            }
          </div>
        )}

        {/* Playlist info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isLoading ? (
            <>
              <Skeleton.Input active size="small" style={{ width: '70%', height: '28px', marginBottom: '8px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px' }} />
              <Skeleton.Input active size="small" style={{ width: '50%', height: '16px', marginBottom: '12px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '6px' }} />
              <Flex gap={8}>
                <Skeleton.Button active size="small" style={{ width: '110px', height: '28px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.1)' }} />
              </Flex>
            </>
          ) : (
            <>
              <h1 style={{ color: '#F1F5F9', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', lineHeight: '1.2', margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </h1>
              <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 400, lineHeight: '1.4', margin: '0 0 12px 0' }}>
                {formatTrackCount(trackCount)}
              </p>
              <Flex gap={8} wrap="wrap">
                {links.map(link => {
                  const meta = PROVIDER_META[link.provider]
                  if (!meta) return null
                  return (
                    <Flex
                      key={link.provider}
                      align="center"
                      gap={6}
                      style={{
                        background: 'rgba(28, 31, 33, 0.8)',
                        borderRadius: '20px',
                        padding: '4px 10px 4px 4px',
                      }}
                    >
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FontAwesomeIcon icon={meta.icon} style={{ color: 'white', fontSize: '11px' }} />
                      </div>
                      <span style={{ color: '#F1F5F9', fontSize: '11px', fontWeight: 600 }}>{link.playlistName}</span>
                    </Flex>
                  )
                })}
              </Flex>
            </>
          )}
        </div>
      </Flex>

      {/* Action buttons */}
      <Flex justify="center" align="center" gap={24} style={{ paddingTop: '16px', borderTop: '1px solid #2A2D30' }}>
        <button
          onClick={onLinkPlatform}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
        >
          <LinkOutlined style={{ fontSize: '20px', color: '#38BDF8' }} />
          <span style={{ color: '#38BDF8', fontSize: '12px', fontWeight: 600 }}>Link Platform</span>
        </button>
      </Flex>
    </Card>
  )
}
