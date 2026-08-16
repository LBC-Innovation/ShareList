import { useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import { RouterProvider } from 'react-router';
import { LoginScreen } from './components/LoginScreen';
import { router } from './routes';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#38BDF8',
          colorBgBase: '#111314',
          colorBgContainer: '#1C1F21',
          colorBorder: '#2A2D30',
          colorText: '#F1F5F9',
          colorTextSecondary: '#64748B',
          fontFamily: 'Inter, system-ui, sans-serif',
          borderRadius: 8,
        },
        components: {
          Button: {
            primaryColor: '#38BDF8',
          },
          Badge: {
            dotSize: 8,
          },
          Progress: {
            circleTextColor: '#F1F5F9',
          },
          Form: {
            labelColor: '#F1F5F9',
          },
          Input: {
            colorTextPlaceholder: '#64748B',
          },
          Table: {
            headerBg: 'rgba(28, 31, 33, 0.6)',
            headerColor: '#94A3B8',
            rowHoverBg: 'rgba(56, 189, 248, 0.05)',
            borderColor: '#2A2D30',
          },
          Drawer: {
            colorBgElevated: '#111314',
            colorText: '#F1F5F9',
          },
          Modal: {
            contentBg: 'rgba(17, 19, 20, 0.98)',
            headerBg: 'rgba(17, 19, 20, 0.98)',
            contentPadding: 0,
            headerPadding: 0,
            borderRadiusLG: 16,
          },
        },
      }}
    >
      {!isLoggedIn ? (
        <LoginScreen onLogin={() => setIsLoggedIn(true)} />
      ) : (
        <RouterProvider router={router} />
      )}
    </ConfigProvider>
  );
}