import { ConfigProvider, theme } from 'antd'
import { Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/MainLayout'
import { PermissionRoute } from './components/PermissionRoute'
import { SignIn } from './pages/SignIn'
import { SignUp } from './pages/SignUp'
import { PasswordResetRequest } from './pages/PasswordResetRequest'
import { PasswordResetConfirm } from './pages/PasswordResetConfirm'
import { MagicLinkConfirm } from './pages/MagicLinkConfirm'
import { Profile } from './pages/Profile'
import { ShareListsView } from './pages/ShareListsView'
import { CreateShareList } from './pages/CreateShareList'
import { PlaylistView } from './pages/PlaylistView'
import { AdminUsers } from './pages/AdminUsers'
import { Friends } from './pages/Friends'
import { InviteLanding } from './pages/InviteLanding'
import { Settings } from './pages/Settings'
import { HowToUse } from './pages/HowToUse'
import { InstallBanner } from './components/InstallBanner'
import { PwaDebugOverlay } from './components/PwaDebugOverlay'
import { UpdateBanner } from './components/UpdateBanner'

const SL = {
  bg: '#111314',
  surface: '#1C1F21',
  nav: '#161819',
  border: '#2A2D30',
  accent: '#38BDF8',
  mint: '#4ADE80',
  text: '#F1F5F9',
  muted: '#64748B',
}

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: SL.accent,
          colorBgBase: SL.bg,
          colorBgContainer: SL.surface,
          colorBorder: SL.border,
          colorText: SL.text,
          colorTextSecondary: SL.muted,
          fontFamily: 'Inter, system-ui, sans-serif',
          borderRadius: 8,
        },
        components: {
          Button: { primaryColor: '#FFFFFF' },
          Badge: { dotSize: 8 },
          Progress: { circleTextColor: SL.text },
          Form: { labelColor: SL.text },
          Input: { colorTextPlaceholder: SL.muted },
          Select: {
            optionPadding: '18px 12px',
            optionHeight: 56,
            singleItemHeightLG: 56,
          },
          Table: {
            headerBg: 'rgba(28, 31, 33, 0.6)',
            headerColor: '#94A3B8',
            rowHoverBg: 'rgba(56, 189, 248, 0.05)',
            borderColor: SL.border,
          },
          Drawer: {
            colorBgElevated: SL.bg,
            colorText: SL.text,
          },
          Modal: {
            contentBg: 'rgba(17, 19, 20, 0.98)',
            headerBg: 'rgba(17, 19, 20, 0.98)',
            borderRadiusLG: 16,
          },
        },
      }}
    >
      <Routes>
        {/* Auth routes — standalone, no shell */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<PasswordResetRequest />} />
        <Route path="/reset-password" element={<PasswordResetConfirm />} />
        <Route path="/magic-link" element={<MagicLinkConfirm />} />
        <Route path="/invite/:token" element={<InviteLanding />} />

        {/* Authenticated routes — wrapped in MainLayout */}
        <Route element={<MainLayout />}>
          <Route index element={<ShareListsView />} />
          <Route path="/create" element={<CreateShareList />} />
          <Route path="/list/:id" element={<PlaylistView />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/how-to-use" element={<HowToUse />} />
          <Route
            path="/admin/users"
            element={
              <PermissionRoute permission="usermanage:listusers">
                <AdminUsers />
              </PermissionRoute>
            }
          />
          <Route path="/friends" element={<Friends />} />
          {/* /settings and /settings/streaming (post-OAuth landing) both render Settings */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/streaming" element={<Settings />} />
        </Route>
      </Routes>
      <InstallBanner />
      <UpdateBanner />
      <PwaDebugOverlay />
    </ConfigProvider>
  )
}

export default App
