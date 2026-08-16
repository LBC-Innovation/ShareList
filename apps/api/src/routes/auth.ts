import { Router } from 'express'
import type { Request, Response } from 'express'
import type { User, Platform, ApiResult, ApiError } from '@sharelist/shared'
import { supabaseAuth, supabaseAdmin } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'

const router = Router()

function log(level: string, message: string, ctx: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level, message, ...ctx }))
}

function profileToUser(
  userId: string,
  email: string,
  role: string,
  permissions: string[],
  profile: {
    display_name: string | null
    avatar_url: string | null
    spotify_connected: boolean
    apple_music_connected: boolean
    youtube_music_connected: boolean
    created_at: string
  }
): User {
  const connectedPlatforms: Platform[] = []
  if (profile.spotify_connected) connectedPlatforms.push('spotify')
  if (profile.apple_music_connected) connectedPlatforms.push('apple_music')
  if (profile.youtube_music_connected) connectedPlatforms.push('youtube_music')

  return {
    id: userId,
    email,
    displayName: profile.display_name ?? email.split('@')[0] ?? '',
    avatarUrl: profile.avatar_url ?? undefined,
    connectedPlatforms,
    createdAt: profile.created_at,
    role,
    permissions,
  }
}

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    const err: ApiError = { data: null, error: { message: 'email and password are required' } }
    res.status(400).json(err)
    return
  }

  const { data, error } = await supabaseAuth.auth.signUp({ email, password })
  if (error) {
    log('warn', 'Register failed', { email, error: error.message })
    const err: ApiError = { data: null, error: { message: error.message, code: error.code } }
    res.status(400).json(err)
    return
  }

  const result: ApiResult<typeof data> = { data, error: null }
  res.status(201).json(result)
})

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    const err: ApiError = { data: null, error: { message: 'email and password are required' } }
    res.status(400).json(err)
    return
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })
  if (error) {
    log('warn', 'Login failed', { email, error: error.message })
    const err: ApiError = { data: null, error: { message: error.message } }
    res.status(401).json(err)
    return
  }

  const result: ApiResult<typeof data> = { data, error: null }
  res.json(result)
})

// POST /auth/logout — requires valid session
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  // Re-extract token from header (guaranteed present — requireAuth already validated it)
  const token = (req.headers.authorization as string).slice(7)
  const { error } = await supabaseAuth.auth.admin.signOut(token)
  if (error) {
    log('error', 'Logout failed', { userId: req.user!.id, error: error.message })
    const err: ApiError = { data: null, error: { message: error.message } }
    res.status(500).json(err)
    return
  }

  const result: ApiResult<{ success: boolean }> = { data: { success: true }, error: null }
  res.json(result)
})

// POST /auth/password-reset/request
// Body: { email, redirectTo? } — redirectTo is the frontend URL Supabase redirects to after link click
router.post('/password-reset/request', async (req: Request, res: Response) => {
  const { email, redirectTo } = req.body as { email?: string; redirectTo?: string }
  if (!email) {
    const err: ApiError = { data: null, error: { message: 'email is required' } }
    res.status(400).json(err)
    return
  }

  const options = redirectTo ? { redirectTo } : undefined
  const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, options)
  if (error) {
    log('error', 'Password reset request failed', { email, error: error.message })
    const err: ApiError = { data: null, error: { message: error.message } }
    res.status(500).json(err)
    return
  }

  const result: ApiResult<{ success: boolean }> = { data: { success: true }, error: null }
  res.json(result)
})

// POST /auth/password-reset/confirm
// Body: { access_token, password }
// Supabase emails a magic link that redirects to the frontend with access_token in the URL hash.
// The frontend extracts it and sends it here along with the new password.
router.post('/password-reset/confirm', async (req: Request, res: Response) => {
  const { access_token, password } = req.body as {
    access_token?: string
    password?: string
  }
  if (!access_token || !password) {
    const err: ApiError = { data: null, error: { message: 'access_token and password are required' } }
    res.status(400).json(err)
    return
  }

  const { data: { user }, error: getUserError } = await supabaseAuth.auth.getUser(access_token)
  if (getUserError || !user) {
    log('warn', 'Password reset confirm: invalid token', { error: getUserError?.message })
    const err: ApiError = { data: null, error: { message: 'Invalid or expired token' } }
    res.status(400).json(err)
    return
  }

  const { error: updateError } = await supabaseAuth.auth.admin.updateUserById(user.id, { password })
  if (updateError) {
    log('error', 'Password reset confirm: update failed', { userId: user.id, error: updateError.message })
    const err: ApiError = { data: null, error: { message: updateError.message } }
    res.status(500).json(err)
    return
  }

  const result: ApiResult<{ success: boolean }> = { data: { success: true }, error: null }
  res.json(result)
})

// GET /auth/me — returns current authenticated user + profile
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('display_name, avatar_url, spotify_connected, apple_music_connected, youtube_music_connected, created_at')
    .eq('id', req.user!.id)
    .single()

  if (error || !profile) {
    log('error', 'Failed to fetch profile for /me', { userId: req.user!.id, error: error?.message })
    const err: ApiError = { data: null, error: { message: 'Profile not found' } }
    res.status(404).json(err)
    return
  }

  const user = profileToUser(req.user!.id, req.user!.email, req.user!.role, req.user!.permissions, profile as Parameters<typeof profileToUser>[4])
  const result: ApiResult<User> = { data: user, error: null }
  res.json(result)
})

export default router
