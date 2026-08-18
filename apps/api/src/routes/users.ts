import { Router } from 'express'
import type { Request, Response } from 'express'
import type { User, ApiResult, ApiError } from '@sharelist/shared'
import { supabaseAuth, supabaseAdmin } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'
import { connectedPlatformsForUser } from '../lib/connectedPlatforms'

const router = Router()

function log(level: string, message: string, ctx: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level, message, ...ctx }))
}

type ProfileRow = {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

function profileToUser(
  email: string,
  role: string,
  permissions: string[],
  profile: ProfileRow,
  connectedPlatforms: User['connectedPlatforms'],
): User {
  return {
    id: profile.id,
    email,
    displayName: profile.display_name ?? email.split('@')[0] ?? '',
    avatarUrl: profile.avatar_url ?? undefined,
    connectedPlatforms,
    createdAt: profile.created_at,
    role,
    permissions,
  }
}

// GET /users/:id — own profile, or admin can fetch any
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = req.params['id'] as string

  if (id !== req.user!.id && req.user!.role !== 'admin') {
    const err: ApiError = { data: null, error: { message: 'Forbidden' } }
    res.status(403).json(err)
    return
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, avatar_url, created_at')
    .eq('id', id)
    .single()

  if (profileError || !profile) {
    log('warn', 'Profile not found', { requestedId: id, requesterId: req.user!.id, error: profileError?.message })
    const err: ApiError = { data: null, error: { message: 'User not found' } }
    res.status(404).json(err)
    return
  }

  // Fetch email from auth.users via admin API
  const { data: authData, error: authError } = await supabaseAuth.auth.admin.getUserById(id)
  if (authError || !authData.user) {
    log('error', 'Failed to fetch auth user for profile', { id, error: authError?.message })
    const err: ApiError = { data: null, error: { message: 'User not found' } }
    res.status(404).json(err)
    return
  }

  const role = (authData.user.app_metadata?.['role'] as string | undefined) ?? 'user'
  const permissions = (authData.user.app_metadata?.['permissions'] as string[] | undefined) ?? []
  let connectedPlatforms: User['connectedPlatforms'] = []
  try {
    connectedPlatforms = await connectedPlatformsForUser(id)
  } catch (err) {
    log('warn', 'Failed to load connected platforms for user', {
      requestedId: id,
      error: err instanceof Error ? err.message : String(err),
    })
  }
  const user = profileToUser(authData.user.email ?? '', role, permissions, profile as ProfileRow, connectedPlatforms)
  const result: ApiResult<User> = { data: user, error: null }
  res.json(result)
})

// PATCH /users/:id — update own display_name and/or avatar_url
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = req.params['id'] as string

  if (id !== req.user!.id) {
    const err: ApiError = { data: null, error: { message: 'Forbidden' } }
    res.status(403).json(err)
    return
  }

  const body = req.body as Record<string, unknown>
  const updates: { display_name?: string; avatar_url?: string } = {}

  if ('display_name' in body) {
    if (typeof body['display_name'] !== 'string') {
      const err: ApiError = { data: null, error: { message: 'display_name must be a string' } }
      res.status(400).json(err)
      return
    }
    updates.display_name = body['display_name']
  }

  if ('avatar_url' in body) {
    if (typeof body['avatar_url'] !== 'string') {
      const err: ApiError = { data: null, error: { message: 'avatar_url must be a string' } }
      res.status(400).json(err)
      return
    }
    updates.avatar_url = body['avatar_url']
  }

  if (Object.keys(updates).length === 0) {
    const err: ApiError = { data: null, error: { message: 'No valid fields to update' } }
    res.status(400).json(err)
    return
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select('id, display_name, avatar_url, created_at')
    .single()

  if (error || !profile) {
    log('error', 'Profile update failed', { userId: id, error: error?.message })
    const err: ApiError = { data: null, error: { message: 'Update failed' } }
    res.status(500).json(err)
    return
  }

  let connectedPlatforms: User['connectedPlatforms'] = []
  try {
    connectedPlatforms = await connectedPlatformsForUser(id)
  } catch (err) {
    log('warn', 'Failed to load connected platforms after profile update', {
      userId: id,
      error: err instanceof Error ? err.message : String(err),
    })
  }
  const user = profileToUser(req.user!.email, req.user!.role, req.user!.permissions, profile as ProfileRow, connectedPlatforms)
  const result: ApiResult<User> = { data: user, error: null }
  res.json(result)
})

export default router
