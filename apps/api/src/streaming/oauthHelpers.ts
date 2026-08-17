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
  /** undefined leaves the existing DB value unchanged on upsert. */
  providerEmail?: string | null
}

export interface ConnectedProvider {
  provider: string
  providerUserId: string | null
  connectedAt: string
  providerEmail: string | null
}

// ── State helpers (CSRF protection) ──────────────────────────────────────────

const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes

function stateSecret(): string {
  const s = process.env['OAUTH_STATE_SECRET']
  if (!s) throw new Error('OAUTH_STATE_SECRET env var is not set')
  return s
}

export interface OAuthState {
  userId: string
  returnOrigin?: string
  redirectUri?: string
}

/**
 * Generates a signed, expiring state string for an OAuth flow.
 * Format: `v2.<userId>.<expiresAt>.<nonce>.<returnOriginB64>.<redirectUriB64>.<hmac>`
 * `returnOrigin` / `redirectUri` are base64url or `-` when omitted.
 */
export function generateState(
  userId: string,
  extra: { returnOrigin?: string; redirectUri?: string } = {},
): string {
  const expiresAt = Date.now() + STATE_TTL_MS
  const nonce = crypto.randomBytes(16).toString('hex')
  const returnOrigin = extra.returnOrigin
    ? Buffer.from(extra.returnOrigin).toString('base64url')
    : '-'
  const redirectUri = extra.redirectUri
    ? Buffer.from(extra.redirectUri).toString('base64url')
    : '-'
  const payload = `v2.${userId}.${expiresAt}.${nonce}.${returnOrigin}.${redirectUri}`
  const sig = crypto
    .createHmac('sha256', stateSecret())
    .update(payload)
    .digest('hex')
  return `${payload}.${sig}`
}

function decodeStateField(value: string): string | undefined {
  if (!value || value === '-') return undefined
  return Buffer.from(value, 'base64url').toString()
}

/**
 * Verifies a state string and returns the embedded userId and optional
 * return/redirect URLs. Accepts v1 (legacy) and v2 payloads.
 */
export function verifyState(state: string): OAuthState {
  const parts = state.split('.')
  const version = parts[0]

  if (version === 'v1') {
    if (parts.length !== 5) throw new Error('Invalid state format')
    const [, userId, expiresAtStr, nonce, receivedSig] = parts as [string, string, string, string, string]
    assertFreshSignature(`v1.${userId}.${expiresAtStr}.${nonce}`, expiresAtStr, receivedSig)
    return { userId }
  }

  if (version === 'v2') {
    if (parts.length !== 7) throw new Error('Invalid state format')
    const [, userId, expiresAtStr, nonce, returnOriginB64, redirectUriB64, receivedSig] = parts as [
      string, string, string, string, string, string, string,
    ]
    assertFreshSignature(
      `v2.${userId}.${expiresAtStr}.${nonce}.${returnOriginB64}.${redirectUriB64}`,
      expiresAtStr,
      receivedSig,
    )
    return {
      userId,
      returnOrigin: decodeStateField(returnOriginB64),
      redirectUri: decodeStateField(redirectUriB64),
    }
  }

  throw new Error('Unknown state version')
}

function assertFreshSignature(payload: string, expiresAtStr: string, receivedSig: string): void {
  const expiresAt = parseInt(expiresAtStr, 10)
  if (isNaN(expiresAt) || Date.now() > expiresAt) throw new Error('State has expired')

  const expectedSig = crypto
    .createHmac('sha256', stateSecret())
    .update(payload)
    .digest('hex')

  if (expectedSig.length !== receivedSig.length
    || !crypto.timingSafeEqual(Buffer.from(receivedSig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
    throw new Error('Invalid state signature')
  }
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
  const row: {
    user_id: string
    provider: string
    access_token: string
    refresh_token: string | null
    token_expires_at: string | null
    provider_user_id: string | null
    updated_at: string
    provider_email?: string | null
  } = {
    user_id: userId,
    provider,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken ?? null,
    token_expires_at: tokens.expiresAt?.toISOString() ?? null,
    provider_user_id: tokens.providerUserId ?? null,
    updated_at: new Date().toISOString(),
  }
  if (tokens.providerEmail !== undefined) {
    row.provider_email = tokens.providerEmail
  }

  const { error } = await supabaseAdmin
    .from('connected_services')
    .upsert(row, { onConflict: 'user_id,provider' })

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
    .select('access_token, refresh_token, token_expires_at, provider_user_id, provider_email')
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
    providerEmail: (data as { provider_email: string | null }).provider_email,
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
): Promise<ConnectedProvider[]> {
  const { data, error } = await supabaseAdmin
    .from('connected_services')
    .select('provider, provider_user_id, created_at, provider_email')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`getConnectedProviders failed: ${error.message}`)

  return (data as {
    provider: string
    provider_user_id: string | null
    created_at: string
    provider_email: string | null
  }[]).map(row => ({
    provider: row.provider,
    providerUserId: row.provider_user_id,
    connectedAt: row.created_at,
    providerEmail: row.provider_email,
  }))
}
