import { Layout } from 'antd';
import { Outlet } from 'react-router';
import { TopNavigation } from './TopNavigation';
import { BottomNavigation } from './BottomNavigation';

export function MainLayout() {
  return (
    <Layout style={{ 
      minHeight: '100vh', 
      background: '#111314', 
      position: 'relative', 
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Background gradient accent */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 20% 10%, rgba(56, 189, 248, 0.08) 0%, rgba(56, 189, 248, 0.03) 40%, transparent 70%)',
        }}
      />

      {/* Top Navigation */}
      <TopNavigation />

      {/* Main Content - Router Outlet */}
      <Outlet />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </Layout>
  );
}
