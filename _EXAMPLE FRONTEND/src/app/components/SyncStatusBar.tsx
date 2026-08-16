import { Badge, Button, Flex, Skeleton } from 'antd';

interface SyncStatusBarProps {
  isLoading?: boolean;
}

export function SyncStatusBar({ isLoading = false }: SyncStatusBarProps) {
  if (isLoading) {
    return (
      <Flex justify="space-between" align="center" style={{
        padding: '12px 16px',
        background: 'rgba(28, 31, 33, 0.3)',
        borderRadius: '8px'
      }}>
        <Flex align="center" gap={8}>
          <Skeleton.Avatar 
            active 
            size={10} 
            style={{ 
              background: 'rgba(56, 189, 248, 0.1)',
              borderRadius: '50%'
            }} 
          />
          <Skeleton.Input
            active
            size="small"
            style={{
              width: '200px',
              height: '16px',
              background: 'rgba(56, 189, 248, 0.1)',
              borderRadius: '6px'
            }}
          />
        </Flex>
        <Skeleton.Button
          active
          size="small"
          style={{
            width: '60px',
            height: '20px',
            background: 'rgba(56, 189, 248, 0.1)',
            borderRadius: '6px'
          }}
        />
      </Flex>
    );
  }

  return (
    <Flex justify="space-between" align="center" style={{
      padding: '12px 16px',
      background: 'rgba(28, 31, 33, 0.3)',
      borderRadius: '8px'
    }}>
      <Flex align="center" gap={8}>
        <Badge status="processing" color="#4ADE80" />
        <span style={{ color: '#F1F5F9', fontSize: '13px', fontWeight: 500 }}>
          Live sync active
        </span>
        <span style={{ color: '#64748B', fontSize: '12px', fontWeight: 400 }}>
          · last updated 2 min ago
        </span>
      </Flex>
      <Button
        type="link"
        style={{
          color: '#38BDF8',
          fontSize: '13px',
          fontWeight: 600,
          padding: 0,
        }}
      >
        Manage
      </Button>
    </Flex>
  );
}