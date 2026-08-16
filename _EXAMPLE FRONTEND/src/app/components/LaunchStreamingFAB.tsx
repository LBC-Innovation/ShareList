import { Button } from 'antd';
import { ExternalLink } from 'lucide-react';

export function LaunchStreamingFAB() {
  return (
    <Button
      type="primary"
      shape="circle"
      size="large"
      icon={<ExternalLink style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />}
      style={{
        position: 'fixed',
        bottom: '92px', // Above the 72px bottom nav bar + 20px spacing
        right: '20px',
        width: '56px',
        height: '56px',
        background: '#38BDF8',
        borderColor: '#38BDF8',
        boxShadow: '0 8px 24px rgba(56, 189, 248, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
      }}
    />
  );
}