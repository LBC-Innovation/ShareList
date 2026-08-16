import type { CSSProperties } from 'react'
import { Button, Flex, Grid, Skeleton } from 'antd'
import { SyncOutlined, SwapOutlined } from '@ant-design/icons'

interface SyncStatusBarProps {
  isLoading?: boolean
  syncing?: boolean
  crossSyncing?: boolean
  lastSynced?: Date | null
  onSync?: () => void
  onCrossSync?: () => void
}

function formatLastSynced(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  if (diffSecs < 10) return 'just now'
  if (diffSecs < 60) return `${diffSecs}s ago`
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  return `${diffHours}h ago`
}

const actionButtonStyle: CSSProperties = {
  background: 'transparent',
  borderRadius: '8px',
  height: '28px',
  padding: '0 12px',
  fontSize: '12px',
  fontWeight: 600,
  width: '100%',
}

export function SyncStatusBar({ isLoading = false, syncing = false, crossSyncing = false, lastSynced, onSync, onCrossSync }: SyncStatusBarProps) {
  const screens = Grid.useBreakpoint()
  const isCompact = !screens.md
  const actionGroupStyle: CSSProperties = isCompact
    ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }
    : { display: 'inline-grid', gridAutoFlow: 'column', gridAutoColumns: '1fr', gap: 8, flexShrink: 0 }

  const lastFetched = lastSynced && (
    <span style={{
      color: '#64748B',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      flexShrink: 0,
      textAlign: isCompact ? 'center' : undefined,
      width: isCompact ? '100%' : undefined,
    }}>
      Last Fetched{' '}
      <span style={{ color: '#94A3B8', fontWeight: 500 }}>{formatLastSynced(lastSynced)}</span>
    </span>
  )

  if (isLoading) {
    return (
      <Flex
        vertical={isCompact}
        justify={isCompact ? 'center' : 'space-between'}
        align={isCompact ? 'stretch' : 'center'}
        gap={isCompact ? 8 : 12}
        style={{ padding: '12px 16px', background: 'rgba(28, 31, 33, 0.3)', borderRadius: '8px' }}
      >
        <div style={actionGroupStyle}>
          <Skeleton.Button active size="small" style={{ width: '100%', height: '28px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px' }} />
          <Skeleton.Button active size="small" style={{ width: '100%', height: '28px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px' }} />
        </div>
        <Skeleton.Input active size="small" style={{ width: '120px', height: '16px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px', alignSelf: isCompact ? 'center' : undefined }} />
      </Flex>
    )
  }

  return (
    <Flex
      vertical={isCompact}
      justify={isCompact ? 'center' : 'space-between'}
      align={isCompact ? 'stretch' : 'center'}
      gap={isCompact ? 8 : 12}
      style={{ padding: '12px 16px', background: 'rgba(28, 31, 33, 0.3)', borderRadius: '8px' }}
    >
      <div style={actionGroupStyle}>
        <Button
          size="small"
          loading={crossSyncing}
          icon={<SwapOutlined />}
          onClick={onCrossSync}
          style={{
            ...actionButtonStyle,
            border: '1px solid rgba(74, 222, 128, 0.45)',
            color: '#4ADE80',
          }}
        >
          Sync Lists
        </Button>
        <Button
          size="small"
          loading={syncing}
          icon={<SyncOutlined />}
          onClick={onSync}
          style={{
            ...actionButtonStyle,
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38BDF8',
          }}
        >
          Fetch Songs
        </Button>
      </div>
      {lastFetched}
    </Flex>
  )
}
