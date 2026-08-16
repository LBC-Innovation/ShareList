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

export function SyncStatusBar({ isLoading = false, syncing = false, crossSyncing = false, lastSynced, onSync, onCrossSync }: SyncStatusBarProps) {
  const screens = Grid.useBreakpoint()
  const isCompact = !screens.md

  if (isLoading) {
    return (
      <Flex justify="space-between" align="center" gap={12} style={{ padding: '12px 16px', background: 'rgba(28, 31, 33, 0.3)', borderRadius: '8px' }}>
        <Flex align="center" gap={8} style={{ flex: isCompact ? 1 : undefined, minWidth: 0, width: isCompact ? '100%' : undefined }}>
          <Skeleton.Button active size="small" style={{ flex: isCompact ? 1 : undefined, width: isCompact ? '100%' : '96px', height: '28px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px' }} />
          <Skeleton.Button active size="small" style={{ flex: isCompact ? 1 : undefined, width: isCompact ? '100%' : '96px', height: '28px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px' }} />
        </Flex>
        <Skeleton.Input active size="small" style={{ width: '120px', height: '16px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px', flexShrink: 0 }} />
      </Flex>
    )
  }

  return (
    <Flex justify="space-between" align="center" gap={12} wrap={isCompact ? 'wrap' : false} style={{ padding: '12px 16px', background: 'rgba(28, 31, 33, 0.3)', borderRadius: '8px' }}>
      <Flex align="center" gap={8} style={{ minWidth: 0, flex: 1, width: isCompact ? '100%' : undefined }}>
        <div style={isCompact ? { flex: 1, minWidth: 0 } : undefined}>
          <Button
            size="small"
            block={isCompact}
            loading={crossSyncing}
            icon={<SwapOutlined />}
            onClick={onCrossSync}
            style={{
              background: 'transparent',
              border: '1px solid rgba(74, 222, 128, 0.45)',
              color: '#4ADE80',
              borderRadius: '8px',
              height: '28px',
              padding: '0 10px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Sync Lists
          </Button>
        </div>
        <div style={isCompact ? { flex: 1, minWidth: 0 } : undefined}>
          <Button
            size="small"
            block={isCompact}
            loading={syncing}
            icon={<SyncOutlined />}
            onClick={onSync}
            style={{
              background: 'transparent',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38BDF8',
              borderRadius: '8px',
              height: '28px',
              padding: '0 10px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Fetch Songs
          </Button>
        </div>
      </Flex>
      {lastSynced && (
        <span style={{
          color: '#64748B',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          marginLeft: isCompact ? 'auto' : undefined,
        }}>
          Last Fetched{' '}
          <span style={{ color: '#94A3B8', fontWeight: 500 }}>{formatLastSynced(lastSynced)}</span>
        </span>
      )}
    </Flex>
  )
}
