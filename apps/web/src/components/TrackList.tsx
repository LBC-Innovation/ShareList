import { Avatar, Flex, Space } from 'antd'
import { Shuffle } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpotify, faApple } from '@fortawesome/free-brands-svg-icons'

export interface Track {
  id: string
  title: string
  artist: string
  duration: string
  albumArt?: string
  isPlaying?: boolean
  platform?: 'spotify' | 'apple_music'
}

interface TrackListProps {
  tracks: Track[]
  shuffling?: boolean
  onShuffle?: () => void
}

const PLATFORM_META: Record<string, { icon: typeof faSpotify; color: string }> = {
  spotify:     { icon: faSpotify, color: '#1DB954' },
  apple_music: { icon: faApple,  color: '#FA243C' },
}

export function TrackList({ tracks, shuffling = false, onShuffle }: TrackListProps) {
  const canShuffle = tracks.length > 1 && !shuffling

  return (
    <div
      className={shuffling ? 'sl-shuffling' : undefined}
      style={{
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.05) 0%, rgba(28, 31, 33, 0.3) 30%, transparent 100%)',
        backdropFilter: 'blur(10px)',
        padding: '20px 16px',
      }}
    >
      <Flex justify="space-between" align="center" style={{ marginBottom: '16px' }}>
        <h2 style={{ color: '#F1F5F9', fontSize: '18px', fontWeight: 600, margin: 0 }}>Songs</h2>
        <button
          type="button"
          aria-label="Shuffle songs"
          title="Shuffle"
          disabled={!canShuffle}
          onClick={onShuffle}
          style={{
            padding: '6px',
            background: shuffling ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '8px',
            cursor: canShuffle ? 'pointer' : 'default',
            opacity: tracks.length > 1 ? 1 : 0.4,
          }}
        >
          <Shuffle
            className={shuffling ? 'sl-shuffle-spin' : undefined}
            style={{ width: '18px', height: '18px', color: shuffling ? '#38BDF8' : '#94A3B8' }}
          />
        </button>
      </Flex>

      <Space direction="vertical" size={0} style={{ width: '100%' }}>
        {tracks.map((track, index) => (
          <div
            key={`${track.platform ?? 'track'}:${track.id}`}
            className="sl-track-row"
            style={{
              padding: '12px 8px',
              minHeight: '64px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              animationDelay: shuffling ? `${(index % 8) * 28}ms` : undefined,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(28, 31, 33, 0.4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <Flex align="center" gap={12} style={{ width: '100%' }}>
              <div style={{ width: '16px', textAlign: 'center', flexShrink: 0 }}>
                {track.isPlaying ? (
                  <Flex align="flex-end" justify="center" gap={2} style={{ height: '16px' }}>
                    <div style={{ width: '2px', height: '60%', background: '#38BDF8', animation: 'pulse 1s ease-in-out infinite' }} />
                    <div style={{ width: '2px', height: '100%', background: '#38BDF8', animation: 'pulse 1s ease-in-out infinite 0.2s' }} />
                    <div style={{ width: '2px', height: '40%', background: '#38BDF8', animation: 'pulse 1s ease-in-out infinite 0.4s' }} />
                  </Flex>
                ) : (
                  <span style={{ color: '#64748B', fontSize: '13px' }}>{index + 1}</span>
                )}
              </div>

              {track.albumArt ? (
                <Avatar src={track.albumArt} size={40} shape="square" style={{ borderRadius: '6px', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>🎵</div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: track.isPlaying ? '#38BDF8' : '#F1F5F9', fontSize: '15px', fontWeight: 500 }}>
                  {track.title}
                </div>
                <div style={{ color: '#64748B', fontSize: '13px', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {track.artist}
                </div>
              </div>

              <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
                <span style={{ color: '#64748B', fontSize: '13px', fontWeight: 400 }}>{track.duration}</span>
                {track.platform && PLATFORM_META[track.platform] && (
                  <div
                    style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4, transition: 'opacity 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4' }}
                  >
                    <FontAwesomeIcon
                      icon={PLATFORM_META[track.platform].icon}
                      style={{ width: '16px', height: '16px', color: PLATFORM_META[track.platform].color }}
                    />
                  </div>
                )}
              </Flex>
            </Flex>
          </div>
        ))}
      </Space>
    </div>
  )
}
