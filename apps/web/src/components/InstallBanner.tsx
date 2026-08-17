import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, Flex, Typography } from 'antd'
import { Share, X } from 'lucide-react'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { BrandLogo } from './BrandLogo'

const { Text } = Typography

const AUTH_PREFIXES = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/magic-link',
  '/invite',
]

export function InstallBanner() {
  const location = useLocation()
  const { canPrompt, ios, copy, hasNativePrompt, install, dismiss } = usePwaInstall()
  const [showIosHelp, setShowIosHelp] = useState(false)

  const onAuth = AUTH_PREFIXES.some(path => location.pathname.startsWith(path))

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sl-install-offset',
      canPrompt ? (showIosHelp ? '168px' : '88px') : '0px',
    )
    return () => {
      document.documentElement.style.setProperty('--sl-install-offset', '0px')
    }
  }, [canPrompt, showIosHelp])

  if (!canPrompt) return null

  return (
    <div
      className={onAuth ? 'sl-install-banner sl-install-banner-auth' : 'sl-install-banner'}
      role="dialog"
      aria-label="Install ShareList"
    >
      <Flex align="flex-start" gap={12}>
        <BrandLogo variant="icon" height={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 14, display: 'block', marginBottom: 2 }}>
            {copy.title}
          </Text>
          <Text style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.45, display: 'block' }}>
            {copy.description}
          </Text>
          {ios && showIosHelp && (
            <ol className="sl-install-steps">
              <li>
                Tap <Share style={{ width: 14, height: 14, verticalAlign: '-2px' }} /> Share
              </li>
              <li>Tap <strong>Add to Home Screen</strong></li>
              <li>Tap <strong>Add</strong></li>
            </ol>
          )}
          <Flex gap={8} style={{ marginTop: 10 }}>
            {hasNativePrompt ? (
              <Button
                type="primary"
                size="small"
                onClick={() => { void install() }}
                style={{
                  background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                  border: 'none',
                  fontWeight: 700,
                  height: 32,
                  padding: '0 14px',
                }}
              >
                Install
              </Button>
            ) : (
              <Button
                type="primary"
                size="small"
                onClick={() => setShowIosHelp(open => !open)}
                style={{
                  background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                  border: 'none',
                  fontWeight: 700,
                  height: 32,
                  padding: '0 14px',
                }}
              >
                {showIosHelp ? 'Hide steps' : 'Show steps'}
              </Button>
            )}
            <Button
              size="small"
              onClick={dismiss}
              style={{
                background: 'transparent',
                border: '1px solid #2A2D30',
                color: '#94A3B8',
                height: 32,
                fontWeight: 600,
              }}
            >
              Not now
            </Button>
          </Flex>
        </div>
        <button
          type="button"
          aria-label="Dismiss install prompt"
          onClick={dismiss}
          className="sl-icon-button"
          style={{ marginTop: 2 }}
        >
          <X style={{ width: 16, height: 16, color: '#64748B' }} />
        </button>
      </Flex>
    </div>
  )
}
