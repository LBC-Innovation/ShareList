import type { CSSProperties } from 'react'
import { Button, Flex, Skeleton } from 'antd'
import { SyncOutlined, SwapOutlined, LinkOutlined } from '@ant-design/icons'

interface SyncStatusBarProps {
  isLoading?: boolean
  syncing?: boolean
  crossSyncing?: boolean
  onSync?: () => void
  onCrossSync?: () => void
  onManageList?: () => void
}

const actionButtonStyle: CSSProperties = {
  background: 'transparent',
  borderRadius: '8px',
  height: '44px',
  padding: '0 8px',
  fontSize: '12px',
  fontWeight: 600,
  width: '100%',
}

const actionGroupStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 8,
  width: '100%',
}

export function SyncStatusBar({
  isLoading = false,
  syncing = false,
  crossSyncing = false,
  onSync,
  onCrossSync,
  onManageList,
}: SyncStatusBarProps) {
  if (isLoading) {
    return (
      <Flex
        align="stretch"
        style={{ padding: '12px 16px', background: 'rgba(28, 31, 33, 0.3)', borderRadius: '8px' }}
      >
        <div style={actionGroupStyle}>
          <Skeleton.Button active size="small" style={{ width: '100%', height: '44px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px' }} />
          <Skeleton.Button active size="small" style={{ width: '100%', height: '44px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px' }} />
          <Skeleton.Button active size="small" style={{ width: '100%', height: '44px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px' }} />
        </div>
      </Flex>
    )
  }

  return (
    <Flex
      align="stretch"
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
        <Button
          size="small"
          icon={<LinkOutlined />}
          onClick={onManageList}
          style={{
            ...actionButtonStyle,
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38BDF8',
          }}
        >
          Manage List
        </Button>
      </div>
    </Flex>
  )
}
