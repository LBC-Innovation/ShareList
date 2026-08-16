import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Avatar } from 'antd'
import { resolveAvatarSrc } from '../lib/avatar'

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  size?: number
  shape?: 'circle' | 'square'
  title?: string
  style?: CSSProperties
}

export function UserAvatar({
  src,
  name,
  size = 40,
  shape = 'circle',
  title,
  style,
}: UserAvatarProps) {
  const [imageSrc, setImageSrc] = useState<string>()
  const initials = (name ?? '?').charAt(0).toUpperCase()

  useEffect(() => {
    if (!src?.trim()) {
      setImageSrc(undefined)
      return
    }

    const controller = new AbortController()
    void resolveAvatarSrc(src, controller.signal, size * 2)
      .then(url => {
        if (!controller.signal.aborted) setImageSrc(url ?? undefined)
      })
      .catch(() => {
        if (!controller.signal.aborted) setImageSrc(undefined)
      })

    return () => controller.abort()
  }, [src, size])

  return (
    <span title={title} style={{ display: 'inline-flex', flexShrink: 0 }}>
      <Avatar
        size={size}
        shape={shape}
        src={imageSrc}
        style={{ flexShrink: 0, ...style }}
      >
        {initials}
      </Avatar>
    </span>
  )
}
