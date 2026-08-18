import type { User, ApiResult, ApiError } from '@sharelist/shared'
import { classifyHttpError, unavailableError } from './api-errors'
import { reportApiReachable, reportApiUnreachable } from './connectivity'

export {
  ERROR_FORBIDDEN,
  ERROR_UNAUTHENTICATED,
  ERROR_UNAVAILABLE,
  isUnauthenticated,
  isUnavailable,
} from './api-errors'

const API_URL = import.meta.env.VITE_API_URL
const SESSION_HINT_KEY = 'sl_session_hint'

// Shape returned by /auth/login and /auth/register
export interface AuthSession {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  expires_at?: number
}

export interface AuthData {
  user: { id: string; email: string } | null
  session: AuthSession | null
}

function getToken(): string | null {
  return localStorage.getItem('sl_access_token')
}

export function storeToken(token: string): void {
  localStorage.setItem('sl_access_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('sl_access_token')
  clearSessionHint()
}

export function hasSessionToken(): boolean {
  return Boolean(getToken())
}

export interface SessionHint {
  id: string
  email: string
}

export function storeSessionHint(hint: SessionHint): void {
  try {
    localStorage.setItem(SESSION_HINT_KEY, JSON.stringify(hint))
  } catch {
    // ignore quota / private-mode failures
  }
}

export function readSessionHint(): SessionHint | null {
  try {
    const raw = localStorage.getItem(SESSION_HINT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SessionHint>
    if (typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      return { id: parsed.id, email: parsed.email }
    }
  } catch {
    // ignore malformed hint
  }
  return null
}

export function clearSessionHint(): void {
  try {
    localStorage.removeItem(SESSION_HINT_KEY)
  } catch {
    // ignore
  }
}

function trackResult<T>(result: ApiResult<T>): ApiResult<T> {
  if (result.error?.code === 'UNAVAILABLE') reportApiUnreachable()
  else reportApiReachable()
  return result
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const token = getToken()
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    })

    let body: unknown
    try {
      body = await res.json()
    } catch {
      return trackResult(unavailableError(res.ok ? 'Invalid response' : 'ShareList is unreachable') as ApiResult<T>)
    }

    if (!res.ok) {
      return trackResult(classifyHttpError(res.status, body) as ApiResult<T>)
    }

    if (body && typeof body === 'object' && 'error' in body && (body as ApiError).error) {
      const classified = classifyHttpError(res.status >= 400 ? res.status : 400, body)
      return trackResult(classified as ApiResult<T>)
    }

    return trackResult(body as ApiResult<T>)
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError'
    const message = aborted ? 'Request timed out' : 'ShareList is unreachable'
    return trackResult(unavailableError(message) as ApiResult<T>)
  }
}

export function isError(result: ApiResult<unknown>): result is ApiError {
  return result.error !== null
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function register(email: string, password: string): Promise<ApiResult<AuthData>> {
  return request<AuthData>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function login(email: string, password: string): Promise<ApiResult<AuthData>> {
  return request<AuthData>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout(): Promise<ApiResult<{ success: boolean }>> {
  return request<{ success: boolean }>('/auth/logout', { method: 'POST' })
}

export function getMe(): Promise<ApiResult<User>> {
  return request<User>('/auth/me')
}

export function requestPasswordReset(
  email: string,
  redirectTo: string
): Promise<ApiResult<{ success: boolean }>> {
  return request<{ success: boolean }>('/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email, redirectTo }),
  })
}

export function confirmPasswordReset(
  accessToken: string,
  password: string
): Promise<ApiResult<{ success: boolean }>> {
  return request<{ success: boolean }>('/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ access_token: accessToken, password }),
  })
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  email: string | undefined
  displayName: string | null
  avatarUrl: string | null
  status: string
  permissions: string[]
  emailConfirmed: boolean
  createdAt: string
}

export function adminUpdateUser(
  id: string,
  updates: { display_name?: string; avatar_url?: string }
): Promise<ApiResult<{ success: boolean }>> {
  return request<{ success: boolean }>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export function adminUpdateUserEmail(id: string, email: string): Promise<ApiResult<{ email: string }>> {
  return request<{ email: string }>(`/admin/users/${id}/email`, {
    method: 'PATCH',
    body: JSON.stringify({ email }),
  })
}

export function listAdminUsers(): Promise<ApiResult<AdminUser[]>> {
  return request<AdminUser[]>('/admin/users')
}

export function createAdminUser(email: string, password: string): Promise<ApiResult<{ id: string; email: string }>> {
  return request<{ id: string; email: string }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function suspendUser(id: string): Promise<ApiResult<{ success: boolean }>> {
  return request<{ success: boolean }>(`/admin/users/${id}/suspend`, { method: 'PATCH' })
}

export function unsuspendUser(id: string): Promise<ApiResult<{ success: boolean }>> {
  return request<{ success: boolean }>(`/admin/users/${id}/unsuspend`, { method: 'PATCH' })
}

export function adminResetPassword(id: string, password: string): Promise<ApiResult<{ success: boolean }>> {
  return request<{ success: boolean }>(`/admin/users/${id}/password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export function deleteAdminUser(id: string): Promise<ApiResult<{ success: boolean }>> {
  return request<{ success: boolean }>(`/admin/users/${id}`, { method: 'DELETE' })
}

export function unverifyUser(id: string): Promise<ApiResult<{ success: boolean }>> {
  return request<{ success: boolean }>(`/admin/users/${id}/unverify`, { method: 'POST' })
}

export function sendMagicLink(id: string, redirectTo: string): Promise<ApiResult<{ success: boolean }>> {
  return request<{ success: boolean }>(`/admin/users/${id}/magic-link`, {
    method: 'POST',
    body: JSON.stringify({ redirectTo }),
  })
}

export function resendVerificationEmail(id: string): Promise<ApiResult<{ success: boolean }>> {
  return request<{ success: boolean }>(`/admin/users/${id}/resend-verification`, { method: 'POST' })
}

export function verifyUser(id: string): Promise<ApiResult<{ success: boolean }>> {
  return request<{ success: boolean }>(`/admin/users/${id}/verify`, { method: 'POST' })
}

export function updateUserPermissions(id: string, permissions: string[]): Promise<ApiResult<{ permissions: string[] }>> {
  return request<{ permissions: string[] }>(`/admin/users/${id}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  })
}

export function updateProfile(
  id: string,
  updates: { display_name?: string; avatar_url?: string }
): Promise<ApiResult<User>> {
  return request<User>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

// ─── Streaming ────────────────────────────────────────────────────────────────

export interface StreamingProvider {
  name: string
  displayName: string
}

export interface ConnectedService {
  provider: string
  providerUserId: string | null
  connectedAt: string
  providerEmail: string | null
}

export interface StreamingPlaylist {
  id: string
  name: string
  description?: string
  trackCount: number
  imageUrl?: string
  externalUrl?: string
}

export function listStreamingProviders(): Promise<ApiResult<StreamingProvider[]>> {
  return request<StreamingProvider[]>('/streaming/providers')
}

export function getConnectedServices(): Promise<ApiResult<ConnectedService[]>> {
  return request<ConnectedService[]>('/streaming/connected')
}

export function getStreamingAuthUrl(
  provider: string,
): Promise<ApiResult<{ url: string; redirectUri?: string }>> {
  const params = new URLSearchParams({ returnOrigin: window.location.origin })
  return request<{ url: string; redirectUri?: string }>(`/streaming/${provider}/auth-url?${params.toString()}`)
}

export function submitAppleMusicToken(
  code: string,
  state: string,
): Promise<ApiResult<{ providerUserId: string }>> {
  return request<{ providerUserId: string }>('/streaming/apple_music/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  })
}

export function getStreamingPlaylists(provider: string): Promise<ApiResult<StreamingPlaylist[]>> {
  return request<StreamingPlaylist[]>(`/streaming/${provider}/playlists`)
}

export function disconnectStreamingService(provider: string): Promise<ApiResult<{ disconnected: boolean }>> {
  return request<{ disconnected: boolean }>(`/streaming/${provider}`, { method: 'DELETE' })
}

// ─── ShareLists ───────────────────────────────────────────────────────────────

export interface ShareListLink {
  id?: string
  provider: string
  playlistId: string
  playlistName: string
  imageUrl: string | null
  externalUrl: string | null
  isPrimary: boolean
  userId?: string
}

export interface ShareListSummary {
  id: string
  name: string
  ownerId: string
  createdAt: string
  isShared?: boolean
  links: ShareListLink[]
}

export interface TrackAvailability {
  provider: string
  status: 'present' | 'matched' | 'unmatched' | 'ambiguous' | 'unknown'
}

export interface ShareListTrack {
  id: string
  title: string
  artist: string
  provider?: string
  album?: string
  durationMs: number
  imageUrl?: string
  externalUrl?: string
  platformIds?: Record<string, string>
  availability?: TrackAvailability[]
}

export interface ShareListMember {
  id: string
  displayName: string
  avatarUrl: string | null
}

export interface ShareListDetail extends ShareListSummary {
  tracks: ShareListTrack[]
  ownerEmail?: string
  members?: ShareListMember[]
  warnings?: string[]
}

export function listShareLists(): Promise<ApiResult<ShareListSummary[]>> {
  return request<ShareListSummary[]>('/sharelists')
}

export function createShareList(data: {
  provider: string
  playlistId: string
  playlistName: string
  name?: string
  imageUrl?: string | null
  externalUrl?: string | null
}): Promise<ApiResult<ShareListSummary>> {
  return request<ShareListSummary>('/sharelists', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getShareList(id: string): Promise<ApiResult<ShareListDetail>> {
  return request<ShareListDetail>(`/sharelists/${id}`)
}

export function updateShareList(
  id: string,
  data: { name: string },
): Promise<ApiResult<{ id: string; name: string }>> {
  return request<{ id: string; name: string }>(`/sharelists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteShareList(id: string): Promise<ApiResult<{ deleted: boolean; left: boolean }>> {
  return request<{ deleted: boolean; left: boolean }>(`/sharelists/${id}`, { method: 'DELETE' })
}

export function syncShareList(id: string): Promise<ApiResult<ShareListDetail>> {
  return request<ShareListDetail>(`/sharelists/${id}/sync`, { method: 'POST' })
}

// ── Cross-sync result types ────────────────────────────────────────────────────

export interface CrossSyncLinkResult {
  linkId: string
  provider: string
  playlistName: string
  tracksAdded: number
  skipped: number
  unmatched?: number
  error?: string
}

export interface CrossSyncResult {
  sharelistId: string
  links: CrossSyncLinkResult[]
  totalAdded: number
  totalUnmatched?: number
}

export function crossSyncShareList(id: string): Promise<ApiResult<CrossSyncResult>> {
  return request<CrossSyncResult>(`/sharelists/${id}/cross-sync`, { method: 'POST' })
}

export interface ShuffleLinkResult {
  linkId: string
  provider: string
  playlistName: string
  written: number
  error?: string
}

export interface ShuffleResult {
  sharelistId: string
  links: ShuffleLinkResult[]
  totalWritten: number
}

export function shuffleShareList(id: string, trackIds: string[]): Promise<ApiResult<ShuffleResult>> {
  return request<ShuffleResult>(`/sharelists/${id}/shuffle`, {
    method: 'POST',
    body: JSON.stringify({ trackIds }),
  })
}

export function linkPlaylistToShareList(
  sharelistId: string,
  data: {
    provider: string
    playlistId: string
    playlistName: string
    imageUrl?: string | null
    externalUrl?: string | null
  },
): Promise<ApiResult<{ linked: boolean }>> {
  return request<{ linked: boolean }>(`/sharelists/${sharelistId}/links`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function unlinkPlaylistFromShareList(
  sharelistId: string,
  linkId: string,
): Promise<ApiResult<{ unlinked: boolean }>> {
  return request<{ unlinked: boolean }>(`/sharelists/${sharelistId}/links/${linkId}`, {
    method: 'DELETE',
  })
}

// ─── Friends ──────────────────────────────────────────────────────────────────

const INVITE_TOKEN_KEY = 'sl_invite_token'

export function storeInviteToken(token: string): void {
  localStorage.setItem(INVITE_TOKEN_KEY, token)
}

export function peekInviteToken(): string | null {
  return localStorage.getItem(INVITE_TOKEN_KEY)
}

export function clearInviteToken(): void {
  localStorage.removeItem(INVITE_TOKEN_KEY)
}

export interface FriendList {
  id: string
  name: string
}

export interface Friend {
  userId: string
  email: string
  lists: FriendList[]
}

export interface PendingInvite {
  id: string
  email: string
  sharelistId: string
  sharelistName: string
}

export interface IncomingShareRequest {
  id: string
  inviterEmail: string
  requestedAt: string
  sharelistName: string
}

export interface FriendsOverview {
  friends: Friend[]
  pending: PendingInvite[]
  people: FriendPerson[]
  incoming: IncomingShareRequest[]
}

export interface FriendPerson {
  userId: string | null
  email: string
  status: 'pending' | 'active'
  sharedListIds: string[]
  connectedPlatforms: string[]
}

export interface InvitePreview {
  inviteeEmail: string
  inviterEmail: string
  sharelistName: string
}

export function listFriends(): Promise<ApiResult<FriendsOverview>> {
  return request<FriendsOverview>('/friends')
}

export function sendFriendInvite(
  email: string,
  sharelistId: string,
): Promise<ApiResult<{ sent: boolean }>> {
  return request<{ sent: boolean }>('/friends/invites', {
    method: 'POST',
    body: JSON.stringify({ email, sharelistId }),
  })
}

export function resendFriendInvite(inviteId: string): Promise<ApiResult<{ sent: boolean }>> {
  return request<{ sent: boolean }>(`/friends/invites/${inviteId}/resend`, { method: 'POST' })
}

export function deleteFriendInvite(inviteId: string): Promise<ApiResult<{ deleted: boolean }>> {
  return request<{ deleted: boolean }>(`/friends/invites/${inviteId}`, { method: 'DELETE' })
}

export function getInvitePreview(token: string): Promise<ApiResult<InvitePreview>> {
  return request<InvitePreview>(`/friends/invites/${token}`)
}

export function acceptFriendInvite(
  token: string,
): Promise<ApiResult<{ accepted: boolean; sharelistId: string }>> {
  return request<{ accepted: boolean; sharelistId: string }>(`/friends/invites/${token}/accept`, {
    method: 'POST',
  })
}

export function acceptShareRequest(
  inviteId: string,
): Promise<ApiResult<{ accepted: boolean; sharelistId: string }>> {
  return request<{ accepted: boolean; sharelistId: string }>(`/friends/requests/${inviteId}/accept`, {
    method: 'POST',
  })
}

export function rejectShareRequest(
  inviteId: string,
): Promise<ApiResult<{ rejected: boolean }>> {
  return request<{ rejected: boolean }>(`/friends/requests/${inviteId}/reject`, {
    method: 'POST',
  })
}

export function shareListWithFriend(data: {
  sharelistId: string
  userId?: string | null
  email: string
}): Promise<ApiResult<{ shared: boolean; invited?: boolean }>> {
  return request<{ shared: boolean; invited?: boolean }>('/friends/share', {
    method: 'POST',
    body: JSON.stringify({
      sharelistId: data.sharelistId,
      email: data.email,
      ...(data.userId ? { userId: data.userId } : {}),
    }),
  })
}

export function unshareListWithFriend(data: {
  sharelistId: string
  userId?: string | null
  email: string
}): Promise<ApiResult<{ unshared: boolean }>> {
  return request<{ unshared: boolean }>('/friends/unshare', {
    method: 'POST',
    body: JSON.stringify({
      sharelistId: data.sharelistId,
      email: data.email,
      ...(data.userId ? { userId: data.userId } : {}),
    }),
  })
}

export function removeFriend(data: {
  userId?: string | null
  email: string
}): Promise<ApiResult<{ removed: boolean }>> {
  return request<{ removed: boolean }>('/friends/remove', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email,
      ...(data.userId ? { userId: data.userId } : {}),
    }),
  })
}

export async function acceptStoredInvite(): Promise<string | null> {
  const token = peekInviteToken()
  if (!token) return null
  const result = await acceptFriendInvite(token)
  if (isError(result)) return result.error.message
  clearInviteToken()
  return null
}
