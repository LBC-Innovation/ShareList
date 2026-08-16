import type { CSSProperties, MouseEventHandler } from 'react'

type BrandLogoProps = {
  variant?: 'wordmark' | 'icon'
  height?: number
  responsive?: boolean
  onClick?: MouseEventHandler<HTMLElement>
}

export function BrandLogo({
  variant = 'wordmark',
  height = 28,
  responsive = false,
  onClick,
}: BrandLogoProps) {
  const wrapStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    cursor: onClick ? 'pointer' : undefined,
    lineHeight: 0,
  }

  const wordmark = (
    <img
      src="/logo.png"
      alt={variant === 'icon' && !responsive ? '' : 'ShareList'}
      className="sl-brand-wordmark"
      height={height}
      style={{ height, width: 'auto' }}
    />
  )

  const icon = (
    <img
      src="/logo-icon.png"
      alt={variant === 'wordmark' && responsive ? '' : 'ShareList'}
      className="sl-brand-mark"
      height={height}
      width={height}
      style={{
        height,
        width: height,
        objectFit: 'contain',
        borderRadius: Math.round(height * 0.22),
      }}
    />
  )

  if (variant === 'icon' && !responsive) {
    return (
      <span style={wrapStyle} onClick={onClick}>
        {icon}
      </span>
    )
  }

  if (responsive) {
    return (
      <span className="sl-brand" style={wrapStyle} onClick={onClick}>
        {wordmark}
        {icon}
      </span>
    )
  }

  return (
    <span style={wrapStyle} onClick={onClick}>
      {wordmark}
    </span>
  )
}
