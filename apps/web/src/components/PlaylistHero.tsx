import { useState } from 'react'
import { Card, Flex, Skeleton } from 'antd'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpotify, faApple } from '@fortawesome/free-brands-svg-icons'
import { UserAvatar } from './UserAvatar'

const PROVIDER_META: Record<string, { label: string; icon: typeof faSpotify; color: string }> = {
  spotify:     { label: 'Spotify',     icon: faSpotify, color: '#1DB954' },
  apple_music: { label: 'Apple Music', icon: faApple,   color: '#FA243C' },
}

interface HeroLink {
  provider: string
  playlistName: string
  imageUrl: string | null
  contributor?: {
    displayName: string
    avatarUrl: string | null
  }
}

interface PlaylistHeroProps {
  name: string
  trackCount: number
  links: HeroLink[]
  isLoading?: boolean
}

function formatTrackCount(n: number): string {
  return `${n} ${n === 1 ? 'song' : 'songs'}`
}

function ContributingAccordion({ links }: { links: HeroLink[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ width: '100%', borderTop: '1px solid #2A2D30', paddingTop: 12 }}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '10px 0',
          minHeight: 44,
        }}
      >
        <span style={{
          color: '#F1F5F9',
          fontSize: 13,
          fontWeight: 600,
        }}>
          Contributing Playlists
        </span>
        {open
          ? <ChevronDown size={18} strokeWidth={2.75} color="#F1F5F9" />
          : <ChevronLeft size={18} strokeWidth={2.75} color="#F1F5F9" />}
      </button>

      {open && (
        <Flex vertical style={{ width: '100%', marginTop: 8 }}>
          {links.map((link, index) => {
            const meta = PROVIDER_META[link.provider]
            if (!meta) return null
            return (
              <Flex
                key={`${link.provider}-${link.playlistName}`}
                align="center"
                gap={10}
                style={{
                  width: '100%',
                  padding: '10px 4px',
                  borderTop: index === 0 ? 'none' : '1px solid rgba(42, 45, 48, 0.8)',
                  boxSizing: 'border-box',
                }}
              >
                {link.contributor && (
                  <UserAvatar
                    src={link.contributor.avatarUrl}
                    name={link.contributor.displayName}
                    size={28}
                    title={link.contributor.displayName}
                    style={{
                      backgroundColor: 'rgba(56,189,248,0.18)',
                      color: '#38BDF8',
                      fontSize: 11,
                      fontWeight: 700,
                      border: '1px solid rgba(56,189,248,0.25)',
                    }}
                  />
                )}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: meta.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <FontAwesomeIcon icon={meta.icon} style={{ color: 'white', fontSize: '15px' }} />
                </div>
                <span style={{
                  color: '#F1F5F9',
                  fontSize: 13,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  flex: 1,
                }}>
                  {link.playlistName}
                </span>
              </Flex>
            )
          })}
        </Flex>
      )}
    </div>
  )
}

export function PlaylistHero({ name, trackCount, links, isLoading = false }: PlaylistHeroProps) {
  const images = links.map(l => l.imageUrl).filter((u): u is string => !!u).slice(0, 4)
  const hasContributing = links.length > 0

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
      <Flex gap={16} style={{ marginBottom: isLoading || hasContributing ? '16px' : 0 }}>
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
              <Skeleton.Input active size="small" style={{ width: '50%', height: '16px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '6px' }} />
            </>
          ) : (
            <>
              <h1 style={{ color: '#F1F5F9', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', lineHeight: '1.2', margin: '0 0 4px 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {name}
              </h1>
              <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 400, lineHeight: '1.4', margin: 0 }}>
                {formatTrackCount(trackCount)}
              </p>
            </>
          )}
        </div>
      </Flex>

      {isLoading ? (
        <Skeleton.Input active size="small" style={{ width: '180px', height: '16px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px' }} />
      ) : (
        hasContributing && <ContributingAccordion links={links} />
      )}
    </Card>
  )
}
