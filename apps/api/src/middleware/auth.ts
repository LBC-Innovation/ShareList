import type { Request, Response, NextFunction } from 'express'
import { supabaseAuth, supabaseAdmin } from '../lib/supabase'

function log(level: string, message: string, ctx: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level, message, ...ctx }))
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ data: null, error: { message: 'Missing or invalid authorization header' } })
    return
  }

  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token)

  if (error || !user) {
    log('warn', 'Auth failed: invalid token', { path: req.path, method: req.method })
    res.status(401).json({ data: null, error: { message: 'Invalid or expired token' } })
    return
  }

  // Decode JWT (already validated above) to extract AMR claim
  let amr: string[] | null = null
  try {
    const [, payload] = token.split('.')
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as { amr?: string[] }
    amr = claims.amr ?? null
  } catch {
    // AMR is optional — non-fatal if decode fails
  }

  // Check suspension via service role (bypasses RLS)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()

  if (profileError) {
    log('error', 'Failed to fetch profile during auth check', {
      userId: user.id,
      error: profileError.message,
      path: req.path,
    })
    res.status(500).json({ data: null, error: { message: 'Internal server error' } })
    return
  }

  if ((profile as { status: string } | null)?.status === 'suspended') {
    res.status(403).json({ data: null, error: { message: 'Account suspended', code: 'SUSPENDED' } })
    return
  }

  req.user = {
    id: user.id,
    email: user.email ?? '',
    role: (user.app_metadata?.['role'] as string | undefined) ?? 'user',
    amr,
    permissions: (user.app_metadata?.['permissions'] as string[] | undefined) ?? [],
  }

  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ data: null, error: { message: 'Unauthorized' } })
    return
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ data: null, error: { message: 'Forbidden' } })
    return
  }
  next()
}

export function requirePermission(permission: string) {
  return function (req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({ data: null, error: { message: 'Unauthorized' } })
      return
    }
    if (!req.user.permissions.includes(permission)) {
      res.status(403).json({ data: null, error: { message: `Missing required permission: ${permission}` } })
      return
    }
    next()
  }
}
