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

export function SyncStatusBar({ isLoading = false, syncing = false, crossSyncing = false, lastSynced, onSync, onCrossSync }: SyncStatusBarProps) {
  if (isLoading) {
    return (
      <Flex justify="space-between" align="center" gap={12} style={{ padding: '12px 16px', background: 'rgba(28, 31, 33, 0.3)', borderRadius: '8px' }}>
        <Skeleton.Button active size="small" style={{ width: '160px', height: '20px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px' }} />
        <Skeleton.Input active size="small" style={{ width: '120px', height: '16px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px' }} />
      </Flex>
    )
  }

  return (
    <Flex justify="space-between" align="center" gap={12} style={{ padding: '12px 16px', background: 'rgba(28, 31, 33, 0.3)', borderRadius: '8px' }}>
      <Flex align="center" gap={12} wrap="wrap" style={{ minWidth: 0 }}>
        <Button
          type="text"
          size="small"
          loading={crossSyncing}
          icon={!crossSyncing && <SwapOutlined />}
          onClick={onCrossSync}
          style={{ color: '#4ADE80', fontSize: '12px', fontWeight: 600, padding: '0 6px', height: '24px' }}
        >
          {crossSyncing ? '' : 'Cross Sync'}
        </Button>
        <Button
          type="text"
          size="small"
          loading={syncing}
          icon={!syncing && <SyncOutlined />}
          onClick={onSync}
          style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, padding: '0 6px', height: '24px' }}
        >
          {syncing ? '' : 'Force Sync'}
        </Button>
        {syncing && (
          <span style={{ color: '#38BDF8', fontSize: '12px' }}>syncing…</span>
        )}
        {crossSyncing && !syncing && (
          <span style={{ color: '#4ADE80', fontSize: '12px' }}>cross-syncing…</span>
        )}
      </Flex>
      {lastSynced && (
        <span style={{ color: '#64748B', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          Last Synced{' '}
          <span style={{ color: '#94A3B8', fontWeight: 500 }}>{formatLastSynced(lastSynced)}</span>
        </span>
      )}
    </Flex>
  )
}
