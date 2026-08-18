import { Flex } from 'antd'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpotify, faApple, faSoundcloud } from '@fortawesome/free-brands-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

const PROVIDER_ICONS: Record<string, { icon: IconDefinition; color: string; label: string }> = {
  spotify: { icon: faSpotify, color: '#1DB954', label: 'Spotify' },
  apple_music: { icon: faApple, color: '#FA243C', label: 'Apple Music' },
  soundcloud: { icon: faSoundcloud, color: '#FF5500', label: 'SoundCloud' },
}

export function ConnectedPlatformIcons({
  platforms,
  size = 14,
}: {
  platforms: string[]
  size?: number
}) {
  const items = platforms
    .map(platform => {
      const meta = PROVIDER_ICONS[platform]
      if (!meta) return null
      return { platform, ...meta }
    })
    .filter((item): item is { platform: string; icon: IconDefinition; color: string; label: string } => item !== null)

  if (items.length === 0) return null

  return (
    <Flex align="center" gap={8} wrap="wrap">
      {items.map(item => (
        <span
          key={item.platform}
          title={item.label}
          aria-label={item.label}
          style={{
            width: size + 10,
            height: size + 10,
            borderRadius: 8,
            background: `${item.color}18`,
            border: `1px solid ${item.color}33`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: item.color,
          }}
        >
          <FontAwesomeIcon icon={item.icon} style={{ fontSize: size }} />
        </span>
      ))}
    </Flex>
  )
}
