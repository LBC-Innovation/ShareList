import { Flex, Spin, Typography } from 'antd';
import { Music2 } from 'lucide-react';

const { Text } = Typography;

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#111314',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Background gradient accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        background: 'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.12) 0%, rgba(74, 222, 128, 0.08) 40%, transparent 70%)',
      }} />

      {/* Loading Content */}
      <Flex vertical align="center" gap={24} style={{ position: 'relative', zIndex: 1 }}>
        {/* Animated Logo */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'relative',
            width: '64px',
            height: '64px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}>
            <Music2 style={{
              width: '56px',
              height: '56px',
              color: '#38BDF8',
              position: 'absolute',
              top: 2,
              left: 2,
              strokeWidth: 2.5,
              filter: 'drop-shadow(0 0 20px rgba(56, 189, 248, 0.5))'
            }} />
            <Music2 style={{
              width: '56px',
              height: '56px',
              color: '#4ADE80',
              position: 'absolute',
              top: 6,
              left: 6,
              opacity: 0.5,
              strokeWidth: 2.5,
              filter: 'drop-shadow(0 0 20px rgba(74, 222, 128, 0.5))'
            }} />
          </div>
          
          {/* Spinning ring */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80px',
            height: '80px',
            border: '2px solid transparent',
            borderTopColor: '#38BDF8',
            borderRightColor: '#4ADE80',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>

        {/* Logo Text */}
        <div style={{ fontSize: '36px', lineHeight: 1 }}>
          <span style={{ fontWeight: 300, color: 'white' }}>Share</span>
          <span style={{ fontWeight: 700, color: '#38BDF8' }}>List</span>
        </div>

        {/* Loading Message */}
        <Text style={{
          color: '#64748B',
          fontSize: '15px',
          fontWeight: 500,
          letterSpacing: '0.5px'
        }}>
          {message}
        </Text>

        {/* Custom Spinner */}
        <Spin 
          size="large"
          style={{
            color: '#38BDF8'
          }}
        />
      </Flex>

      {/* Keyframe animations */}
      <style>{`
        @keyframes spin {
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
