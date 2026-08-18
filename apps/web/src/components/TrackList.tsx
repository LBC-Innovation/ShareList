import { useLayoutEffect, useRef } from 'react'
import { Avatar, Flex } from 'antd'
import { Shuffle } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpotify, faApple, faSoundcloud } from '@fortawesome/free-brands-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { TrackAvailability } from '../lib/api'

export const SHUFFLE_MOVE_MS = 1500

const PROVIDER_LABEL: Record<string, string> = {
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  soundcloud: 'SoundCloud',
}

export interface Track {
  id: string
  title: string
  artist: string
  duration: string
  albumArt?: string
  isPlaying?: boolean
  platform?: string
  platformIds?: Record<string, string>
  availability?: TrackAvailability[]
}

function trackKey(track: Track): string {
  return `${track.platform ?? 'track'}:${track.id}`
}

function indexMap(list: Track[]): Map<string, number> {
  return new Map(list.map((track, index) => [trackKey(track), index]))
}

function stackTop(order: Track[], index: number, heights: Map<string, number>): number {
  let top = 0
  for (let i = 0; i < index; i++) {
    const item = order[i]
    if (!item) continue
    top += heights.get(trackKey(item)) ?? 0
  }
  return top
}

function availabilityIcons(track: Track): Array<{
  provider: string
  icon: IconDefinition
  color: string
  muted: boolean
  title: string
}> {
  const items: Array<{
    provider: string
    icon: IconDefinition
    color: string
    muted: boolean
    title: string
  }> = []

  const seen = new Set<string>()
  const add = (provider: string, muted: boolean, title: string) => {
    const meta = PLATFORM_META[provider]
    if (!meta || seen.has(provider)) return
    seen.add(provider)
    items.push({ provider, icon: meta.icon, color: meta.color, muted, title })
  }

  if (track.availability && track.availability.length > 0) {
    for (const row of track.availability) {
      const label = PROVIDER_LABEL[row.provider] ?? row.provider
      if (row.status === 'present' || row.status === 'matched') {
        add(row.provider, false, `Available on ${label}`)
      } else if (row.status === 'ambiguous') {
        add(row.provider, true, `Possible match on ${label} — not synced`)
      } else if (row.status === 'unmatched') {
        add(row.provider, true, `Not available on ${label}`)
      }
    }
  } else if (track.platformIds) {
    for (const provider of Object.keys(track.platformIds)) {
      const label = PROVIDER_LABEL[provider] ?? provider
      add(provider, false, `Available on ${label}`)
    }
  } else if (track.platform) {
    const label = PROVIDER_LABEL[track.platform] ?? track.platform
    add(track.platform, false, `From ${label}`)
  }

  return items
}

interface TrackListProps {
  tracks: Track[]
  shuffling?: boolean
  shuffleFrom?: Track[] | null
  onShuffle?: () => void
}

const PLATFORM_META: Record<string, { icon: IconDefinition; color: string }> = {
  spotify:     { icon: faSpotify,    color: '#1DB954' },
  apple_music: { icon: faApple,      color: '#FA243C' },
  soundcloud:  { icon: faSoundcloud, color: '#FF5500' },
}

export function TrackList({ tracks, shuffling = false, shuffleFrom = null, onShuffle }: TrackListProps) {
  const canShuffle = tracks.length > 1 && !shuffling
  const rowRefs = useRef(new Map<string, HTMLDivElement>())

  useLayoutEffect(() => {
    const rows = [...rowRefs.current.values()]
    const reset = () => {
      for (const el of rows) {
        el.style.transition = ''
        el.style.transform = ''
        el.style.zIndex = ''
        el.style.willChange = ''
      }
    }

    if (!shuffling || !shuffleFrom || shuffleFrom === tracks) {
      reset()
      return
    }

    const fromIndex = indexMap(shuffleFrom)
    const toIndex = indexMap(tracks)
    const heights = new Map<string, number>()
    for (const [key, el] of rowRefs.current) {
      heights.set(key, el.offsetHeight)
    }

    for (const [key, el] of rowRefs.current) {
      const origin = fromIndex.get(key)
      const dest = toIndex.get(key)
      if (origin === undefined || dest === undefined) continue
      const delta = stackTop(shuffleFrom, origin, heights) - stackTop(tracks, dest, heights)
      if (Math.abs(delta) < 1) {
        el.style.transition = ''
        el.style.transform = ''
        el.style.zIndex = ''
        el.style.willChange = ''
        continue
      }
      el.style.transition = 'none'
      el.style.willChange = 'transform'
      el.style.transform = `translateY(${delta}px)`
      el.style.zIndex = String(Math.round(Math.abs(delta)))
    }

    let frame2 = 0
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        for (const el of rowRefs.current.values()) {
          el.style.transition = `transform ${SHUFFLE_MOVE_MS}ms ease-in-out`
          el.style.transform = 'translateY(0)'
        }
      })
    })

    return () => {
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
    }
  }, [tracks, shuffling, shuffleFrom])

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
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            padding: 0,
            lineHeight: 0,
            background: shuffling ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '8px',
            cursor: canShuffle ? 'pointer' : 'default',
            opacity: tracks.length > 1 ? 1 : 0.4,
          }}
        >
          <Shuffle
            className={shuffling ? 'sl-shuffle-spin' : undefined}
            style={{ width: '18px', height: '18px', color: shuffling ? '#38BDF8' : '#94A3B8', display: 'block' }}
          />
        </button>
      </Flex>

      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {tracks.map((track, index) => (
          <div
            key={trackKey(track)}
            ref={el => {
              if (el) rowRefs.current.set(trackKey(track), el)
              else rowRefs.current.delete(trackKey(track))
            }}
            className="sl-track-row"
            style={{
              position: 'relative',
              padding: '12px 8px',
              minHeight: '64px',
              borderRadius: '8px',
              cursor: shuffling ? 'default' : 'pointer',
              pointerEvents: shuffling ? 'none' : undefined,
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              if (shuffling) return
              e.currentTarget.style.background = 'rgba(28, 31, 33, 0.4)'
            }}
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
                {availabilityIcons(track).map(item => (
                  <div
                    key={item.provider}
                    title={item.title}
                    style={{
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: item.muted ? 0.28 : 0.7,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = item.muted ? '0.28' : '0.7' }}
                  >
                    <FontAwesomeIcon
                      icon={item.icon}
                      style={{ width: '16px', height: '16px', color: item.muted ? '#64748B' : item.color }}
                    />
                  </div>
                ))}
              </Flex>
            </Flex>
          </div>
        ))}
      </div>
    </div>
  )
}
