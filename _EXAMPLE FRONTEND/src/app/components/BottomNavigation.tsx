import { Flex } from 'antd';
import { ListMusic, Users, Settings, ShieldCheck, PlusCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const isListView = location.pathname === '/' || location.pathname.startsWith('/list/');

  const navItems = [
    { icon: ListMusic, label: 'My Lists', active: isListView, path: '/' },
    { icon: PlusCircle, label: 'Create', active: location.pathname === '/create', path: '/create' },
    { icon: Settings, label: 'Settings', active: false, path: '/settings' },
    { icon: ShieldCheck, label: 'Admin', active: location.pathname === '/admin', path: '/admin' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#161819',
      borderTop: '1px solid #2A2D30',
      zIndex: 50
    }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <Flex justify="space-around" align="center" style={{ padding: '8px 0' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  minWidth: 0
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Icon
                    style={{
                      width: '24px',
                      height: '24px',
                      color: item.active ? '#38BDF8' : '#64748B',
                      strokeWidth: item.active ? 2.5 : 2
                    }}
                  />
                </div>
                <span
                  style={{
                    color: item.active ? '#38BDF8' : '#64748B',
                    fontSize: '10px',
                    fontWeight: item.active ? 600 : 500
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </Flex>
      </div>
    </nav>
  );
}