# ShareList - Music Playlist Sharing App Integration Guide

## Project Overview

ShareList is a high-fidelity, mobile-first music playlist sharing application built with **pure Ant Design components** (absolutely NO Tailwind CSS). The app connects existing playlists from multiple streaming platforms (Spotify, Amazon Music, etc.) - it does NOT play music, but rather links and syncs playlists across services.

**Key Architecture:**
- React 18.3.1 with TypeScript
- React Router (react-router v7) for navigation using Data mode pattern
- Ant Design 6.x for ALL UI components
- Pure inline styles only (no Tailwind, no CSS modules, no utility classes)
- Mobile-first responsive design with 2026 premium streaming app aesthetics

## Design System & Brand Guidelines

### Color Palette
```javascript
Primary Colors:
- Background: #111314 (deep charcoal)
- Container Background: #1C1F21 (slightly lighter charcoal)
- Border: #2A2D30 (subtle borders)
- Primary Accent: #38BDF8 (sky blue)
- Secondary Accent: #4ADE80 (mint green)
- Text Primary: #F1F5F9 (almost white)
- Text Secondary: #64748B (muted gray)
- Error: #EF4444 (red)
- Success: #4ADE80 (mint green)
```

### Visual Principles
1. **Glass-morphism Effects**: Use `background: 'rgba(28, 31, 33, 0.6)'` with `backdropFilter: 'blur(20px)'`
2. **Subtle Gradients**: Backgrounds like `linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(74, 222, 128, 0.1) 100%)`
3. **Rounded Corners**: Default borderRadius of 8-12px, hero cards use 16-20px
4. **Breathable Spacing**: Generous padding (24-32px), consistent gaps (12-16px)
5. **Soft Shadows**: `boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'`
6. **Inter Font**: Used throughout the entire app

### Ant Design Theme Configuration
```javascript
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
      Button: { primaryColor: '#38BDF8' },
      Badge: { dotSize: 8 },
      Progress: { circleTextColor: '#F1F5F9' },
      Form: { labelColor: '#F1F5F9' },
      Input: { colorTextPlaceholder: '#64748B' },
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
```

## Application Structure

### Routing Architecture
```
/src/app/App.tsx - Main entry point with login gate and ConfigProvider
/src/app/routes.tsx - React Router config
├── / (MainLayout)
│   ├── index (ShareListsView) - List of all ShareLists (created by user + shared with user)
│   ├── /list/:id (PlaylistView) - Individual ShareList detail view with tracks
│   ├── /create (CreateShareList) - Integration workflow to link first playlist
│   └── /admin (UserManagement) - Admin-only user management
```

**Navigation Flow:**
- Home page (`/`) shows all ShareLists in a scrollable list
- Click any ShareList card → navigates to `/list/:id` for detail view
- "Create" button → navigates to `/create` for integration workflow
- Bottom navigation highlights "My Lists" for both `/` and `/list/:id` routes

**Login Flow:**
- App.tsx manages `isLoggedIn` state
- Shows `<LoginScreen>` when logged out
- Shows `<RouterProvider router={router}>` when logged in
- Login/Register/ForgotPassword screens are standalone, not in router

### Page Components

#### 1. **LoginScreen** (`/src/app/components/LoginScreen.tsx`)
- Full-screen centered layout with glass-morphism card
- ShareList logo at top
- Email + Password inputs (Ant Design Form)
- "Remember Me" checkbox
- "Forgot Password?" link (opens ForgotPasswordScreen)
- Primary action button with loading state
- Footer link to RegisterScreen
- **Props:** `onLogin: () => void`

#### 2. **RegisterScreen** (`/src/app/components/RegisterScreen.tsx`)
- Similar layout to LoginScreen
- Display Name, Email, Password, Confirm Password fields
- Password strength indicator
- Terms & Conditions checkbox
- Back to login link
- **Props:** `onBackToLogin: () => void`

#### 3. **ForgotPasswordScreen** (`/src/app/components/ForgotPasswordScreen.tsx`)
- Minimal centered card
- Email input only
- "Send Reset Link" button with success state
- Back to login link
- **Props:** `onBackToLogin: () => void`

#### 4. **MainLayout** (`/src/app/components/MainLayout.tsx`)
- Container with TopNavigation and BottomNavigation
- Uses `<Outlet>` from react-router for child routes
- Mobile-optimized with fixed navigation

#### 5. **ShareListsView** (`/src/app/components/ShareListsView.tsx`) - NEW DEFAULT HOME PAGE
- **CRITICAL:** Main landing page showing all user's ShareLists
- Displays ShareLists as scrollable card list
- Each ShareList card shows:
  - 2x2 mosaic of album cover images
  - ShareList name
  - "Shared" chip badge (purple) if the list was shared with the user
  - Track count and collaborator names
  - Platform icons (Spotify, Amazon Music, Apple Music) showing connected services
- Click any ShareList card → navigates to `/list/:id` for detail view
- Empty state when no ShareLists exist (prompt to create first one)
- Mobile-first layout with glass-morphism cards
- Hover effects with sky blue tint
- **Route:** `/` (index)

#### 6. **PlaylistView** (`/src/app/components/PlaylistView.tsx`)
- Individual ShareList detail page (was previously home page)
- Contains: PlaylistHero, SyncStatusBar, TrackList, LaunchStreamingFAB
- Shows all tracks from the ShareList with real-time sync status
- "Link Platform" button in PlaylistHero opens authentication flow
- "Manage Syncs" button for sync settings
- Mobile-optimized scrollable track list
- **Route:** `/list/:id` (accessed by clicking ShareList from home)

#### 7. **CreateShareList** (`/src/app/components/CreateShareList.tsx`)
- **CRITICAL:** Integration workflow page - starting point for linking first playlist
- **NO ShareList name input** - name is not set at this step
- **Full-page integration flow** (same content as LinkPlaylistModal but as a page):
  - **Step 1:** Select music service from dropdown (Spotify, Amazon Music, Apple Music, Deezer)
  - **Step 2:** Authenticate with selected service (simulates OAuth with loading state)
  - **Step 3:** Loading state while fetching user's playlists
  - **Step 4:** Scrollable playlist selection list with track counts
  - **Step 5:** "Continue" button appears when playlist selected
- Centered card layout with large icon header
- Glass-morphism styling matching app theme
- Success indicators after authentication
- **Route:** `/create` (accessed from bottom nav "Create" button)

#### 8. **UserManagement** (`/src/app/components/UserManagement.tsx`)
- Admin panel for managing users
- User card grid with status badges
- Click card to open UserManagementPanel modal
- "Create User" button opens CreateUserModal
- **CRITICAL:** When `onUpdate` is called from UserManagementPanel, it updates the user in state but KEEPS the modal open by updating `selectedUser` with the new data instead of setting it to null
- Mock user data with interface:
```typescript
interface User {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  status: 'active' | 'suspended';
  permissions: string[]; // ['listusers', 'add', 'suspend', 'delete', 'resetpasswords', 'editpermissions', 'selfmanage']
  joinedDate: string;
  avatarUrl?: string;
}
```

### ShareList Data Model

```typescript
interface ShareList {
  id: string;
  name: string;
  platforms: string[]; // ['spotify', 'amazon', 'apple', 'deezer']
  trackCount: number;
  collaborators: string[]; // Display names of users sharing this list
  isShared: boolean; // true if shared WITH you, false if created BY you
  coverImages: string[]; // 4 album art URLs for mosaic
}
```

### User Journey & Page Interactions

**1. User lands on home page (`/`)**
- Sees ShareListsView with all their ShareLists
- Each ShareList shows mosaic cover, name, track count, collaborators, platforms
- "Shared" purple chip appears on lists shared with them
- Empty state if no ShareLists exist

**2. User clicks "Create" in bottom nav**
- Navigates to `/create` (CreateShareList page)
- Full-page integration workflow:
  - Select music service
  - Authenticate via OAuth simulation
  - View their playlists
  - Select a playlist
  - Click "Continue" to create ShareList from that playlist
- No name input at this stage - ShareList gets name from playlist

**3. User clicks a ShareList card**
- Navigates to `/list/:id` (PlaylistView)
- Sees detailed view with:
  - PlaylistHero showing album mosaic, title, collaborators, platforms
  - SyncStatusBar showing last sync time and live status
  - TrackList with all songs
  - "Link Platform" button to add more music services
  - "Manage Syncs" button for sync settings
  - LaunchStreamingFAB to open in native music app

**4. User clicks "Link Platform" in PlaylistView**
- Opens LinkPlaylistModal (same flow as CreateShareList page)
- Can connect additional music services to same ShareList
- Modal closes after linking, returns to PlaylistView

### Component Library

#### **PlaylistHero** (`/src/app/components/PlaylistHero.tsx`)
- Large gradient card with 2x2 album art mosaic
- Playlist title, description, track count, total duration
- Platform badges (Spotify, Amazon Music) with FontAwesome icons
- Action buttons at bottom:
  - **Link Platform** - Opens modal to connect additional music services (requires `onLinkPlatform` callback)
  - **Manage Syncs** - Placeholder for sync management
- Loading state skeleton during data fetch
- Style: Glass-morphism, 20px border radius, gradient background
- **Props:** `albumImages: string[], isLoading?: boolean, onLinkPlatform?: () => void`

#### **SyncStatusBar** (`/src/app/components/SyncStatusBar.tsx`)
- Live sync indicator with animated Equalizer
- "Last synced" timestamp
- Sync progress indicator (Ant Design Progress)
- Glass-morphism background

#### **TrackList** (`/src/app/components/TrackList.tsx`)
- Scrollable list of TrackListItem components
- Header with "Track", "Artist", "Album", "Duration" columns (desktop only)

#### **TrackListItem** (`/src/app/components/TrackListItem.tsx`)
- Individual track row
- Track number, title, artist, album, duration
- Hover effect with sky blue tint
- Mobile: Stacked layout; Desktop: Row layout

#### **TopNavigation** (`/src/app/components/TopNavigation.tsx`)
- ShareList logo (left)
- User avatar/menu (right)
- Transparent background with bottom border

#### **BottomNavigation** (`/src/app/components/BottomNavigation.tsx`)
- Fixed bottom nav with Lucide React icons
- Four navigation items:
  - **My Lists** (ListMusic icon) - Active for both `/` and `/list/:id` routes
  - **Create** (PlusCircle icon) - Navigates to `/create`
  - **Settings** (Settings icon) - Placeholder for future settings page
  - **Admin** (ShieldCheck icon) - Navigates to `/admin` (admin only)
- Active state with sky blue color (#38BDF8)
- Glass-morphism background
- Smart highlighting: "My Lists" active for home AND detail views

#### **LaunchStreamingFAB** (`/src/app/components/LaunchStreamingFAB.tsx`)
- Floating Action Button (bottom-right)
- Opens platform selector (Spotify/Amazon Music)
- Ant Design FloatButton with custom styling

#### **ShareListLogo** (`/src/app/components/ShareListLogo.tsx`)
- SVG logo component with gradient
- **Props:** `size?: number` (default: 32)

#### **Equalizer** (`/src/app/components/Equalizer.tsx`)
- Animated bars using CSS keyframes
- 4 bars with varying heights
- Pulse animation defined in `/src/styles/index.css`

#### **UserManagementPanel** (`/src/app/components/UserManagementPanel.tsx`)
- **CRITICAL PATTERN:** Ant Design Modal (centered, full-height scrollable)
- **Modal NEVER closes automatically during edits** - only closes when user clicks X or Cancel
- Parent component (UserManagement) keeps modal open by updating `selectedUser` instead of setting to null
- Full-height scrollable content with sticky header
- Sections:
  1. **User Profile** - Avatar, name, email, verified badge, join date
  2. **Authentication** - Email verification status, magic link sender
  3. **Security & Access** - Password reset, account status toggle (instant save)
  4. **Permissions** - 7 permission toggles with **INSTANT AUTO-SAVE** (NO "Save Permissions" button)
  5. **Danger Zone** - Delete account button (only action that closes modal)

**INSTANT AUTO-SAVE PERMISSION PATTERN (CRITICAL):**
```javascript
// IMPORTANT: Modal stays open, each permission Switch auto-saves immediately
// NO "Save Permissions" button exists - removed to prevent confusion
// Each permission Switch has onChange handler that:
// 1. Sets loading state on that specific switch
// 2. Saves to backend immediately via onUpdate callback
// 3. Shows success/error icon next to permission name
// 4. Auto-clears indicator after 1.5-2 seconds
// 5. Modal remains open for continued editing (parent updates selectedUser, doesn't clear it)

const [permissionLoading, setPermissionLoading] = useState<{
  [key: string]: boolean;
}>({});

const [permissionResults, setPermissionResults] = useState<{
  [key: string]: 'success' | 'error' | null;
}>({});

const handlePermissionToggle = async (permKey: string, checked: boolean) => {
  setPermissionLoading(prev => ({ ...prev, [permKey]: true }));
  setPermissionResults(prev => ({ ...prev, [permKey]: null }));
  
  try {
    // Simulate API call - replace with your backend
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Update user permissions immediately
    const updated = {
      ...localUser,
      permissions: checked 
        ? [...localUser.permissions, permKey]
        : localUser.permissions.filter(p => p !== permKey)
    };
    setLocalUser(updated);
    onUpdate(updated); // Propagate to parent - parent keeps modal open
    
    setPermissionResults(prev => ({ ...prev, [permKey]: 'success' }));
    // Auto-clear success indicator after 1.5s
    setTimeout(() => {
      setPermissionResults(prev => ({ ...prev, [permKey]: null }));
    }, 1500);
  } catch (error) {
    setPermissionResults(prev => ({ ...prev, [permKey]: 'error' }));
    // Auto-clear error indicator after 2s
    setTimeout(() => {
      setPermissionResults(prev => ({ ...prev, [permKey]: null }));
    }, 2000);
  } finally {
    setPermissionLoading(prev => ({ ...prev, [permKey]: false }));
  }
};

// In JSX - NOTE: No "Save Permissions" button after the list
<Space direction="vertical" size={12} style={{ width: '100%' }}>
  {allPermissions.map(perm => (
    <Flex key={perm.key} justify="space-between" align="center">
      <div style={{ flex: 1, marginRight: '16px' }}>
        <Flex align="center" gap={8}>
          <Text style={{ color: '#F1F5F9', fontSize: '13px', fontWeight: 600 }}>
            {perm.name}
          </Text>
          {permissionLoading[perm.key] && (
            <LoadingOutlined style={{ color: '#38BDF8', fontSize: '12px' }} />
          )}
          {permissionResults[perm.key] === 'success' && (
            <CheckCircleOutlined style={{ color: '#4ADE80', fontSize: '12px' }} />
          )}
          {permissionResults[perm.key] === 'error' && (
            <CloseCircleFilled style={{ color: '#EF4444', fontSize: '12px' }} />
          )}
        </Flex>
        <Text style={{ color: '#64748B', fontSize: '11px' }}>
          {perm.description}
        </Text>
      </div>
      <Switch 
        checked={localUser.permissions.includes(perm.key)}
        loading={permissionLoading[perm.key]}
        onChange={(checked) => handlePermissionToggle(perm.key, checked)}
        style={{ minWidth: '44px' }}
      />
    </Flex>
  ))}
</Space>
// NO BUTTON HERE - permissions auto-save on toggle
```

**Parent Component Pattern (UserManagement.tsx):**
```javascript
{selectedUser && (
  <UserManagementPanel 
    user={selectedUser}
    onClose={() => setSelectedUser(null)} // Only called on X button click
    onUpdate={(updatedUser) => {
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      // CRITICAL: Keep modal open by updating selectedUser with new data
      setSelectedUser(updatedUser); // Don't set to null!
    }}
    onDelete={(userId) => {
      setUsers(users.filter(u => u.id !== userId));
      setSelectedUser(null); // Only delete closes modal
    }}
  />
)}
```

#### **CreateUserModal** (`/src/app/components/CreateUserModal.tsx`)
- Ant Design Modal with Form
- Fields: Display Name, Email, Initial Password
- Permission checkboxes
- Submit creates user and closes modal
- **Props:** `visible: boolean, onClose: () => void, onCreate: (user: Omit<User, 'id' | 'joinedDate'>) => void`

#### **LinkPlaylistModal** (`/src/app/components/LinkPlaylistModal.tsx`)
- **CRITICAL:** Multi-step modal for linking third-party playlists
- **Step 1:** Select music service from dropdown (Spotify, Amazon Music, Apple Music, Deezer)
- **Step 2:** Authenticate button - simulates OAuth flow with loading state
- **Step 3:** After auth, displays loading spinner while fetching playlists
- **Step 4:** Shows scrollable list of user's playlists with track counts
- Click playlist to select (shows checkmark), then "Link Playlist" button
- Modal stays open during authentication and playlist loading
- Cancel button resets all state
- **Props:** 
  - `visible: boolean`
  - `onClose: () => void`
  - `onLink: (service: string, playlistId: string, playlistName: string) => void`

**LinkPlaylistModal Workflow:**
```javascript
// Parent component (CreateShareList) usage:
const handleLinkPlaylist = async (service: string, playlistId: string, playlistName: string) => {
  setShowLinkModal(false);
  setIsSyncing(true); // Show loading screen
  
  // Simulate API call to sync playlist
  await syncPlaylistWithBackend(service, playlistId);
  
  // Add to linked playlists
  const newPlaylist = { id: playlistId, name: playlistName, service, trackCount: 42 };
  setLinkedPlaylists([...linkedPlaylists, newPlaylist]);
  
  setIsSyncing(false);
  setSyncComplete(true); // Show success message
};

<LinkPlaylistModal
  visible={showLinkModal}
  onClose={() => setShowLinkModal(false)}
  onLink={handleLinkPlaylist}
/>
```

## Critical Implementation Guidelines

### 1. **ABSOLUTELY NO TAILWIND CSS**
- Delete any tailwind.config files
- Remove `@tailwindcss/vite` from vite.config.ts
- Use ONLY Ant Design components with inline `style` props
- No className with Tailwind utility classes (no flex, grid, p-, m-, w-, h-, text-, bg-, etc.)

### 2. **Styling Pattern**
```javascript
// ✅ CORRECT - Inline styles
<div style={{
  background: 'rgba(28, 31, 33, 0.6)',
  backdropFilter: 'blur(20px)',
  borderRadius: '16px',
  padding: '24px',
  border: '1px solid #2A2D30'
}}>

// ✅ CORRECT - Ant Design component props
<Button 
  type="primary"
  size="large"
  loading={isLoading}
  block
  style={{ 
    borderRadius: '10px',
    height: '48px'
  }}
/>

// ❌ WRONG - Tailwind classes
<div className="bg-gray-800 rounded-lg p-6">

// ❌ WRONG - Any utility classes
<div className="flex items-center gap-4">
```

### 3. **Loading States & User Feedback**
- All buttons have loading states
- Use Ant Design's built-in `loading` prop
- Show success/error icons after async actions
- Auto-clear feedback indicators after 1.5-2 seconds
- **CRITICAL:** Modal stays open during permission toggles - user can keep editing
- Parent component must update `selectedUser` instead of clearing it on `onUpdate` callback

### 4. **Responsive Design**
- Mobile-first approach
- Use Ant Design `Space`, `Flex`, `Grid` for layouts
- Hide/show elements with style conditions:
```javascript
<div style={{ display: isMobile ? 'none' : 'block' }}>
```

### 5. **Icon Usage**
- `@ant-design/icons` for UI icons (CheckCircleOutlined, DeleteOutlined, etc.)
- `@fortawesome/react-fontawesome` for brand icons (Spotify, Amazon)
```javascript
import { faSpotify, faAmazon } from '@fortawesome/free-brands-svg-icons';
<FontAwesomeIcon icon={faSpotify} />
```

### 6. **Form Handling**
- Use Ant Design Form component
- Built-in validation rules
```javascript
<Form.Item
  name="email"
  rules={[
    { required: true, message: 'Please enter your email' },
    { type: 'email', message: 'Please enter a valid email' }
  ]}
>
  <Input prefix={<MailOutlined />} placeholder="Email" />
</Form.Item>
```

## Music Service Integration Flow

### OAuth Authentication Pattern

When user selects a music service (Spotify, Amazon Music, etc.) in CreateShareList or LinkPlaylistModal:

1. **Initiate OAuth:**
```javascript
const handleAuthenticate = async () => {
  setIsAuthenticating(true);
  
  try {
    // Call backend to get OAuth URL
    const response = await fetch(`/api/integrations/${selectedService}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirectUri: window.location.origin + '/oauth/callback' })
    });
    const { authUrl } = await response.json();
    
    // Open OAuth window or redirect
    window.location.href = authUrl;
  } catch (error) {
    message.error('Failed to authenticate');
  }
};
```

2. **Handle OAuth Callback:**
- Backend receives authorization code from music service
- Exchanges code for access token
- Stores token in session or database
- Redirects back to app with success flag

3. **Fetch User's Playlists:**
```javascript
const fetchPlaylists = async () => {
  setIsLoadingPlaylists(true);
  
  try {
    const response = await fetch(`/api/integrations/${selectedService}/playlists`);
    const data = await response.json();
    setPlaylists(data.playlists);
  } catch (error) {
    message.error('Failed to load playlists');
  } finally {
    setIsLoadingPlaylists(false);
  }
};
```

4. **Create ShareList from Selected Playlist:**
```javascript
const handleContinue = async () => {
  const playlist = playlists.find(p => p.id === selectedPlaylist);
  
  try {
    const response = await fetch('/api/sharelists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playlistId: playlist.id,
        service: selectedService
      })
    });
    const { shareList } = await response.json();
    
    // Navigate to new ShareList detail page
    navigate(`/list/${shareList.id}`);
  } catch (error) {
    message.error('Failed to create ShareList');
  }
};
```

### Real-time Sync Status

The SyncStatusBar component shows live sync status. Backend should provide:

```javascript
// WebSocket or polling endpoint
GET /api/sharelists/:id/sync-status - → { 
  status: 'syncing' | 'synced' | 'error',
  lastSyncTime: '2026-04-13T10:30:00Z',
  progress: 75 // percentage if syncing
}
```

## Backend Integration Instructions

### Authentication Endpoints Needed
```
POST /api/auth/login - { email, password } → { token, user }
POST /api/auth/register - { displayName, email, password } → { user }
POST /api/auth/forgot-password - { email } → { success }
POST /api/auth/logout - → { success }
```

### ShareList Endpoints Needed
```
GET /api/sharelists - → { shareLists: ShareList[] }
  // Returns all ShareLists (created by user + shared with user)
  // Each ShareList includes isShared flag

GET /api/sharelists/:id - → { shareList: ShareList, tracks: Track[] }
  // Returns detailed ShareList with full track listing

POST /api/sharelists - { playlistId, service } → { shareList: ShareList }
  // Creates new ShareList from selected playlist
  // Service: 'spotify' | 'amazon' | 'apple' | 'deezer'
  // ShareList name comes from playlist name

POST /api/sharelists/:id/platforms - { service, playlistId } → { shareList: ShareList }
  // Links additional platform to existing ShareList
  // Syncs tracks across platforms

GET /api/integrations/:service/playlists - → { playlists: ThirdPartyPlaylist[] }
  // Returns user's playlists from specific service after OAuth
  // Requires authentication with that service first

POST /api/integrations/:service/auth - { redirectUri } → { authUrl }
  // Initiates OAuth flow for music service
  // Returns URL to redirect user for authentication

GET /api/integrations/:service/callback - { code } → { success, token }
  // OAuth callback endpoint
  // Exchanges auth code for access token
```

### User Management Endpoints Needed
```
GET /api/admin/users - → { users: User[] }
GET /api/admin/users/:id - → { user: User }
POST /api/admin/users - { displayName, email, password, permissions } → { user: User }
PATCH /api/admin/users/:id/status - { status: 'active' | 'suspended' } → { user: User }
PATCH /api/admin/users/:id/permissions - { permission: string, action: 'add' | 'remove' } → { user: User }
PATCH /api/admin/users/:id/profile - { displayName, avatarUrl } → { user: User }
POST /api/admin/users/:id/verify-email - → { user: User }
POST /api/admin/users/:id/revoke-verification - → { user: User }
POST /api/admin/users/:id/send-magic-link - → { success }
POST /api/admin/users/:id/reset-password - { password } → { success }
DELETE /api/admin/users/:id - → { success }
```

### Replace Mock Data
Current components use mock data. Search for:
- `const shareLists: ShareList[]` in ShareListsView.tsx
- `const albumImages` and `const tracks` in PlaylistView.tsx
- `const mockPlaylists` in CreateShareList.tsx
- `const mockPlaylists` in LinkPlaylistModal.tsx
- `useState<User[]>([...])` in UserManagement.tsx
- Replace with API calls using fetch/axios

**Example - Loading ShareLists:**
```javascript
// In ShareListsView.tsx
const [shareLists, setShareLists] = useState<ShareList[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const fetchShareLists = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sharelists');
      const data = await response.json();
      setShareLists(data.shareLists);
    } catch (error) {
      message.error('Failed to load ShareLists');
    } finally {
      setIsLoading(false);
    }
  };
  
  fetchShareLists();
}, []);
```

### Add Loading States
Wrap API calls with loading states:
```javascript
const [isLoading, setIsLoading] = useState(false);

const fetchUsers = async () => {
  setIsLoading(true);
  try {
    const response = await fetch('/api/admin/users');
    const data = await response.json();
    setUsers(data.users);
  } catch (error) {
    message.error('Failed to load users');
  } finally {
    setIsLoading(false);
  }
};
```

### Error Handling
Use Ant Design message/notification:
```javascript
import { message } from 'antd';

try {
  // API call
} catch (error) {
  message.error(error.message || 'Something went wrong');
}
```

## File Structure
```
/src/app/
├── App.tsx (Main entry with ConfigProvider and login gate)
├── routes.tsx (React Router config - defines all routes)
└── components/
    ├── LoginScreen.tsx (Login page with email/password)
    ├── RegisterScreen.tsx (Registration page)
    ├── ForgotPasswordScreen.tsx (Password reset page)
    ├── MainLayout.tsx (Layout wrapper with nav bars)
    ├── TopNavigation.tsx (Top nav with logo and user menu)
    ├── BottomNavigation.tsx (Fixed bottom nav - My Lists, Create, Settings, Admin)
    ├── ShareListsView.tsx (NEW - Home page showing all ShareLists)
    ├── PlaylistView.tsx (Individual ShareList detail page)
    ├── PlaylistHero.tsx (ShareList header with album mosaic and platform badges)
    ├── SyncStatusBar.tsx (Live sync status with animated equalizer)
    ├── TrackList.tsx (Scrollable track list container)
    ├── TrackListItem.tsx (Individual track row)
    ├── Equalizer.tsx (Animated sync indicator)
    ├── LaunchStreamingFAB.tsx (Floating action button for platform selector)
    ├── ShareListLogo.tsx (SVG logo component)
    ├── CreateShareList.tsx (Integration workflow page - link first playlist)
    ├── LinkPlaylistModal.tsx (Multi-step playlist linking modal)
    ├── UserManagement.tsx (Admin page - user grid and modals)
    ├── UserManagementPanel.tsx (User edit modal with instant-save permissions)
    └── CreateUserModal.tsx (Create new user modal)

/src/styles/
├── index.css (Imports fonts.css, theme.css, animations)
├── fonts.css (Inter font import)
└── theme.css (Base HTML/body styles - NO Tailwind)
```

## Key Dependencies (package.json)
```json
{
  "antd": "^6.3.5",
  "@ant-design/icons": "^6.1.1",
  "@ant-design/colors": "^8.0.1",
  "@fortawesome/fontawesome-svg-core": "^7.2.0",
  "@fortawesome/free-brands-svg-icons": "^7.2.0",
  "@fortawesome/react-fontawesome": "^3.3.0",
  "react-router": "7.13.0"
}
```

## Animation Keyframes
Add to `/src/styles/index.css`:
```css
@keyframes pulse {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.6); }
}
```

## Testing the Integration

### Page Navigation & Routing
1. **Home page (`/`)** - ShareListsView loads with all user's ShareLists
2. **Click ShareList card** - Navigates to `/list/:id` and loads PlaylistView
3. **Bottom nav "My Lists"** - Active state works for both `/` and `/list/:id`
4. **Bottom nav "Create"** - Navigates to `/create` integration workflow
5. **Back navigation** - Browser back button works correctly between pages

### Integration Workflow (`/create`)
6. **Service selection** - Can select Spotify, Amazon Music, Apple Music, or Deezer
7. **Authentication flow** - Loading state shows during OAuth simulation
8. **Playlist loading** - Spinner appears while fetching playlists
9. **Playlist selection** - Can click to select, checkmark appears
10. **Continue button** - Appears when playlist selected, creates ShareList
11. **Error handling** - Graceful handling if no playlists found

### ShareList Detail View (`/list/:id`)
12. **PlaylistHero** - Mosaic loads, platform badges display correctly
13. **Link Platform button** - Opens modal for connecting additional services
14. **SyncStatusBar** - Shows sync status with animated equalizer
15. **TrackList** - All tracks render with correct layout on mobile/desktop
16. **LaunchStreamingFAB** - Platform selector opens correctly

### User Management & Authentication
17. Verify login flow works with your backend
18. Test user management CRUD operations
19. **Confirm instant permission toggles save to backend WITHOUT closing modal**
20. **Verify modal stays open when toggling permissions, changing status, verifying email, etc.**
21. **Confirm modal only closes when clicking X button or deleting user**

### Cross-cutting Concerns
22. Test responsive layout on mobile/desktop across ALL pages
23. Verify all loading states and error handling
24. Check dark theme consistency across all pages
25. Verify success/error indicators appear and auto-clear
26. Test "Shared" chip appears only on shared ShareLists
27. Verify empty states work (no ShareLists, no playlists in service, etc.)

---

## CRITICAL REMINDERS

**✅ DO:**
- Use ONLY Ant Design components
- All styling via inline `style` props
- Instant auto-save pattern for permissions (NO "Save Permissions" button)
- Keep modal open during all edits by updating `selectedUser` in parent
- Loading states on ALL async operations
- Auto-clearing success/error indicators (1.5-2s)
- Mobile-first, responsive design
- Inter font throughout

**❌ DON'T:**
- NO Tailwind CSS whatsoever
- NO CSS modules or external stylesheets (except fonts.css, theme.css)
- NO utility classes in className props
- DO NOT close modal after permission toggle - keep it open for more edits
- DO NOT set `selectedUser` to null in `onUpdate` callback
- DO NOT add "Save" buttons for instant-save actions

**🔑 KEY PATTERN - Modal Stays Open:**
```javascript
// In UserManagement.tsx parent component:
onUpdate={(updatedUser) => {
  setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
  setSelectedUser(updatedUser); // ✅ Update, don't clear - keeps modal open
  // setSelectedUser(null); ❌ WRONG - would close modal
}}
```