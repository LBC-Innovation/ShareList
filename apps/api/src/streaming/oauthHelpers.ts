/**
 * Provider-agnostic OAuth utilities shared by all streaming provider modules.
 *
 * Responsibilities:
 *   - CSRF-safe state parameter generation and verification (HMAC-signed)
 *   - Token persistence (upsert / read / delete rows in connected_services)
 *
 * This module has zero provider-specific imports.
 */

import crypto from 'crypto'
import { supabaseAdmin } from '../lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

export interface StoredTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  providerUserId: string | null
}

// ── State helpers (CSRF protection) ──────────────────────────────────────────

const STATE_VERSION = 'v1'
const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes

function stateSecret(): string {
  const s = process.env['OAUTH_STATE_SECRET']
  if (!s) throw new Error('OAUTH_STATE_SECRET env var is not set')
  return s
}

/**
 * Generates a signed, expiring state string for an OAuth flow.
 * Format: `v1.<userId>.<expiresAt>.<nonce>.<hmac>`
 */
export function generateState(userId: string): string {
  const expiresAt = Date.now() + STATE_TTL_MS
  const nonce = crypto.randomBytes(16).toString('hex')
  const payload = `${STATE_VERSION}.${userId}.${expiresAt}.${nonce}`
  const sig = crypto
    .createHmac('sha256', stateSecret())
    .update(payload)
    .digest('hex')
  return `${payload}.${sig}`
}

/**
 * Verifies a state string and returns the embedded userId.
 * Throws if the state is malformed, expired, or has an invalid signature.
 */
export function verifyState(state: string): string {
  const parts = state.split('.')
  if (parts.length !== 5) throw new Error('Invalid state format')

  const [version, userId, expiresAtStr, nonce, receivedSig] = parts as [string, string, string, string, string]

  if (version !== STATE_VERSION) throw new Error('Unknown state version')

  const expiresAt = parseInt(expiresAtStr, 10)
  if (isNaN(expiresAt) || Date.now() > expiresAt) throw new Error('State has expired')

  const payload = `${version}.${userId}.${expiresAtStr}.${nonce}`
  const expectedSig = crypto
    .createHmac('sha256', stateSecret())
    .update(payload)
    .digest('hex')

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(receivedSig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
    throw new Error('Invalid state signature')
  }

  return userId
}

// ── Token persistence ─────────────────────────────────────────────────────────

/**
 * Upserts OAuth tokens for a user / provider pair in connected_services.
 * Calling this twice for the same user + provider replaces the old tokens.
 */
export async function storeTokens(
  userId: string,
  provider: string,
  tokens: StoredTokens,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('connected_services')
    .upsert(
      {
        user_id: userId,
        provider,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken ?? null,
        token_expires_at: tokens.expiresAt?.toISOString() ?? null,
        provider_user_id: tokens.providerUserId ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' },
    )

  if (error) throw new Error(`storeTokens failed for ${provider}: ${error.message}`)
}

/**
 * Retrieves stored tokens for a user / provider pair.
 * Returns null if the user has not connected this provider.
 */
export async function getTokens(
  userId: string,
  provider: string,
): Promise<StoredTokens | null> {
  const { data, error } = await supabaseAdmin
    .from('connected_services')
    .select('access_token, refresh_token, token_expires_at, provider_user_id')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // no rows
    throw new Error(`getTokens failed for ${provider}: ${error.message}`)
  }

  return {
    accessToken: (data as { access_token: string }).access_token,
    refreshToken: (data as { refresh_token: string | null }).refresh_token,
    expiresAt: (data as { token_expires_at: string | null }).token_expires_at
      ? new Date((data as { token_expires_at: string }).token_expires_at)
      : null,
    providerUserId: (data as { provider_user_id: string | null }).provider_user_id,
  }
}

/**
 * Deletes stored tokens for a user / provider pair.
 * Safe to call even if the user was never connected.
 */
export async function deleteTokens(userId: string, provider: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('connected_services')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider)

  if (error) throw new Error(`deleteTokens failed for ${provider}: ${error.message}`)
}

/**
 * Returns all providers the user has connected, with connection timestamps.
 */
export async function getConnectedProviders(
  userId: string,
): Promise<{ provider: string; providerUserId: string | null; connectedAt: string }[]> {
  const { data, error } = await supabaseAdmin
    .from('connected_services')
    .select('provider, provider_user_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`getConnectedProviders failed: ${error.message}`)

  return (data as { provider: string; provider_user_id: string | null; created_at: string }[]).map(row => ({
    provider: row.provider,
    providerUserId: row.provider_user_id,
    connectedAt: row.created_at,
  }))
}
