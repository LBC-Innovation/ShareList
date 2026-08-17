import type { ReactNode } from 'react'
import { Modal, Button, Flex, Typography } from 'antd'
import { Share } from 'lucide-react'
import { BrandLogo } from './BrandLogo'
import { getClientOs } from '../lib/pwa'
import { getInstallCopy, getInstallPlatform, type InstallPlatform } from '../lib/install-copy'

const { Text, Title } = Typography

const SL = {
  border: 'rgba(56, 189, 248, 0.2)',
  accent: '#38BDF8',
  text: '#F1F5F9',
  muted: '#64748B',
}

interface InstallInstructionsModalProps {
  open: boolean
  onClose: () => void
}

function StepList({ children }: { children: ReactNode }) {
  return (
    <ol style={{ margin: '8px 0 0', paddingLeft: 18, color: '#94A3B8', fontSize: 13, lineHeight: 1.65 }}>
      {children}
    </ol>
  )
}

function IosSteps() {
  return (
    <StepList>
      <li>Open ShareList in Safari</li>
      <li>
        Tap <Share style={{ width: 14, height: 14, verticalAlign: '-2px' }} /> Share
      </li>
      <li>Tap <strong style={{ color: SL.text }}>Add to Home Screen</strong></li>
      <li>Tap <strong style={{ color: SL.text }}>Add</strong></li>
    </StepList>
  )
}

function AndroidSteps() {
  return (
    <StepList>
      <li>Open ShareList in Chrome</li>
      <li>Tap the menu (⋮)</li>
      <li>Tap <strong style={{ color: SL.text }}>Install app</strong> or <strong style={{ color: SL.text }}>Add to Home Screen</strong></li>
    </StepList>
  )
}

function DesktopSteps() {
  return (
    <StepList>
      <li>Open ShareList in Chrome or Edge</li>
      <li>Click the install icon in the address bar, or open the browser menu and choose <strong style={{ color: SL.text }}>Install ShareList</strong></li>
    </StepList>
  )
}

const PLATFORM_STEPS: Record<InstallPlatform, () => ReactNode> = {
  ios: IosSteps,
  android: AndroidSteps,
  desktop: DesktopSteps,
}

function platformTitle(platform: InstallPlatform, current: InstallPlatform, desktopLabel: string): string {
  if (platform === 'ios') return current === 'ios' ? 'This iPhone or iPad' : 'iPhone & iPad'
  if (platform === 'android') return current === 'android' ? 'This phone' : 'Android'
  return current === 'desktop' ? desktopLabel : 'Computer'
}

export function InstallInstructionsModal({ open, onClose }: InstallInstructionsModalProps) {
  const os = getClientOs()
  const copy = getInstallCopy(os)
  const current = getInstallPlatform(os)
  const order: InstallPlatform[] = [current, ...(['ios', 'android', 'desktop'] as const).filter(p => p !== current)]

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={440}
      centered
      style={{ padding: 0 }}
      styles={{
        container: {
          background: 'rgba(17, 19, 20, 0.98)',
          backdropFilter: 'blur(40px)',
          border: `1px solid ${SL.border}`,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          borderRadius: '16px',
          padding: 0,
          overflow: 'hidden',
        },
        body: { padding: 0, margin: 0 },
        mask: { backdropFilter: 'blur(3px)', background: 'rgba(0, 0, 0, 0.4)' },
      }}
    >
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(56, 189, 248, 0.1)',
        background: `linear-gradient(135deg, ${SL.accent}18 0%, transparent 60%)`,
      }}>
        <Flex align="center" gap={14}>
          <BrandLogo variant="icon" height={48} />
          <div>
            <Title level={4} style={{ color: SL.text, margin: 0, fontSize: 16, fontWeight: 700 }}>
              {copy.title}
            </Title>
            <Text style={{ color: SL.muted, fontSize: 13 }}>
              {copy.description}
            </Text>
          </div>
        </Flex>
      </div>

      <div style={{ padding: '20px 24px 24px' }}>
        <Flex vertical gap={16}>
          {order.map((platform, index) => {
            const Steps = PLATFORM_STEPS[platform]
            return (
              <div key={platform}>
                {index === 1 && (
                  <Text style={{
                    color: SL.muted,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 10,
                  }}>
                    Other devices
                  </Text>
                )}
                <Text style={{ color: SL.text, fontSize: 14, fontWeight: 600, display: 'block' }}>
                  {platformTitle(platform, current, copy.platformLabel)}
                </Text>
                <Steps />
              </div>
            )
          })}

          <Flex justify="flex-end">
            <Button
              onClick={onClose}
              style={{
                background: `${SL.accent}18`,
                border: `1px solid ${SL.accent}44`,
                color: SL.accent,
                borderRadius: 10,
                height: 40,
                padding: '0 20px',
                fontWeight: 700,
              }}
            >
              Got it
            </Button>
          </Flex>
        </Flex>
      </div>
    </Modal>
  )
}
