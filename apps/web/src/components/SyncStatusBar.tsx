import type { CSSProperties } from 'react'
import { Button, Flex, Skeleton } from 'antd'
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

const equalActionGroupStyle: CSSProperties = {
  display: 'inline-grid',
  gridAutoFlow: 'column',
  gridAutoColumns: '1fr',
  gap: 8,
  flexShrink: 0,
}

export function SyncStatusBar({ isLoading = false, syncing = false, crossSyncing = false, lastSynced, onSync, onCrossSync }: SyncStatusBarProps) {
  if (isLoading) {
    return (
      <Flex justify="space-between" align="center" gap={12} wrap="wrap" style={{ padding: '12px 16px', background: 'rgba(28, 31, 33, 0.3)', borderRadius: '8px' }}>
        <div style={equalActionGroupStyle}>
          <Skeleton.Button active size="small" style={{ width: '110px', height: '28px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px' }} />
          <Skeleton.Button active size="small" style={{ width: '110px', height: '28px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px' }} />
        </div>
        <Skeleton.Input active size="small" style={{ width: '120px', height: '16px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px', flexShrink: 0 }} />
      </Flex>
    )
  }

  return (
    <Flex justify="space-between" align="center" gap={12} wrap="wrap" style={{ padding: '12px 16px', background: 'rgba(28, 31, 33, 0.3)', borderRadius: '8px' }}>
      <div style={equalActionGroupStyle}>
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
      {lastSynced && (
        <span style={{
          color: '#64748B',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          marginLeft: 'auto',
        }}>
          Last Fetched{' '}
          <span style={{ color: '#94A3B8', fontWeight: 500 }}>{formatLastSynced(lastSynced)}</span>
        </span>
      )}
    </Flex>
  )
}
