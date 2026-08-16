import { Flex } from 'antd';
import { Music2 } from 'lucide-react';

export function ShareListLogo() {
  return (
    <Flex align="center" gap={8}>
      <div style={{ position: 'relative', width: '24px', height: '24px' }}>
        <Music2 style={{
          width: '20px',
          height: '20px',
          color: '#38BDF8',
          position: 'absolute',
          top: 0,
          left: 0,
          strokeWidth: 2.5
        }} />
        <Music2 style={{
          width: '20px',
          height: '20px',
          color: '#38BDF8',
          position: 'absolute',
          top: 2,
          left: 4,
          opacity: 0.6,
          strokeWidth: 2.5
        }} />
      </div>
      <div style={{ fontSize: '18px', lineHeight: 1 }}>
        <span style={{ fontWeight: 300, color: 'white' }}>Share</span>
        <span style={{ fontWeight: 700, color: '#38BDF8' }}>List</span>
      </div>
    </Flex>
  );
}
