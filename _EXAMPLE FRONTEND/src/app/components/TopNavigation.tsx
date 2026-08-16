import { Avatar, Badge, Flex, Skeleton } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { Music2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';

export function TopNavigation() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading user data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: '#111314',
      borderBottom: '1px solid #2A2D30',
      padding: '14px 20px'
    }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <Flex justify="space-between" align="center">
          {/* Logo */}
          <Flex align="center" gap={8}>
            <div 
              style={{ 
                position: 'relative', 
                width: '24px', 
                height: '24px',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/')}
            >
              <Music2 style={{ 
                width: '20px', 
                height: '20px', 
                color: '#38BDF8', 
                position: 'absolute',
                top: 1,
                left: 1
              }} />
              <Music2 style={{ 
                width: '20px', 
                height: '20px', 
                color: '#38BDF8', 
                position: 'absolute',
                top: 3,
                left: 3,
                opacity: 0.5
              }} />
            </div>
            <Flex align="baseline" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
              <span style={{ 
                color: 'white', 
                fontWeight: 300, 
                fontSize: '18px', 
                letterSpacing: '-0.3px' 
              }}>Share</span>
              <span style={{ 
                color: '#38BDF8', 
                fontWeight: 700, 
                fontSize: '18px', 
                letterSpacing: '-0.3px' 
              }}>List</span>
            </Flex>
          </Flex>

          {/* Right side */}
          <Flex align="center" gap={16}>
            <button style={{
              position: 'relative',
              padding: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}>
              <BellOutlined style={{ fontSize: '20px', color: '#64748B' }} />
            </button>
            {isLoading ? (
              <Skeleton.Avatar 
                active 
                size={34} 
                style={{ 
                  background: 'rgba(56, 189, 248, 0.1)',
                  borderRadius: '50%'
                }} 
              />
            ) : (
              <Badge
                dot
                color="#4ADE80"
                offset={[-2, 30]}
                style={{ boxShadow: '0 0 0 2px #111314' }}
              >
                <Avatar
                  size={34}
                  style={{
                    background: 'linear-gradient(135deg, #38BDF8 0%, #4ADE80 100%)',
                    fontWeight: 600,
                  }}
                >
                  M
                </Avatar>
              </Badge>
            )}
          </Flex>
        </Flex>
      </div>
    </nav>
  );
}