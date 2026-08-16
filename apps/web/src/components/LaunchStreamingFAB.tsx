import { notification } from 'antd'
import { ExternalLink } from 'lucide-react'

interface LaunchStreamingFABProps {
  externalUrl?: string | null
}

export function LaunchStreamingFAB({ externalUrl }: LaunchStreamingFABProps) {
  const handleClick = () => {
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer')
    } else {
      notification.info({
        message: 'No streaming link',
        description: 'This ShareList has no external URL linked yet.',
        placement: 'topRight',
      })
    }
  }

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: '92px',
        right: '20px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: '#38BDF8',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        boxShadow: '0 8px 24px rgba(56, 189, 248, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.08)'
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(56, 189, 248, 0.55), 0 4px 8px rgba(0, 0, 0, 0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(56, 189, 248, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)'
      }}
    >
      <ExternalLink style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
    </button>
  )
}
