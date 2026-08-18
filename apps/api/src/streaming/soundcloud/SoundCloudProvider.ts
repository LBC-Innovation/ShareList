/**
 * SoundCloud streaming provider.
 *
 * Auth: OAuth 2.1 authorization code with PKCE. Access tokens expire in ~1 hour.
 * Refresh tokens are single-use — refresh is serialized per user.
 *
 * Env vars required:
 *   SOUNDCLOUD_CLIENT_ID
 *   SOUNDCLOUD_CLIENT_SECRET
 *   SOUNDCLOUD_REDIRECT_URI
 */

import crypto from 'crypto'
import {
  generateState,
  verifyState,
  storeTokens,
  getTokens,
  deleteTokens,
} from '../oauthHelpers'
import { soundcloudFetch } from './soundcloudHttp'
import type {
  StreamingPlaylist,
  StreamingProvider,
  StreamingTrack,
  TrackSearchQuery,
  TrackSearchResult,
} from '../types'
import { pickBestTrackMatch } from '../../services/trackMatchScore'

const PROVIDER_NAME = 'soundcloud'
const API = 'https://api.soundcloud.com'
const AUTH = 'https://secure.soundcloud.com'
const REFRESH_BUFFER_MS = 5 * 60 * 1000

function clientId(): string {
  const v = process.env['SOUNDCLOUD_CLIENT_ID']
  if (!v) throw new Error('SOUNDCLOUD_CLIENT_ID env var is not set')
  return v
}

function clientSecret(): string {
  const v = process.env['SOUNDCLOUD_CLIENT_SECRET']
  if (!v) throw new Error('SOUNDCLOUD_CLIENT_SECRET env var is not set')
  return v
}

function redirectUri(): string {
  const v = process.env['SOUNDCLOUD_REDIRECT_URI']
  if (!v) throw new Error('SOUNDCLOUD_REDIRECT_URI env var is not set')
  return v.split(',')[0]?.trim() || v
}

function generatePkce(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
}

interface SoundCloudUser {
  id: number
  username?: string
  permalink_url?: string
}

interface SoundCloudTrack {
  id?: number
  kind?: string
  title?: string
  duration?: number
  artwork_url?: string | null
  permalink_url?: string
  isrc?: string | null
  metadata_artist?: string | null
  user?: { username?: string; avatar_url?: string | null }
}

interface SoundCloudPlaylist {
  id?: number
  title?: string
  description?: string | null
  track_count?: number
  artwork_url?: string | null
  permalink_url?: string
  tracks?: SoundCloudTrack[]
}

interface CollectionResponse<T> {
  collection?: T[]
  next_href?: string | null
}

const refreshLocks = new Map<string, Promise<string>>()
const writeLocks = new Map<string, Promise<unknown>>()

async function withLock<T>(
  map: Map<string, Promise<unknown>>,
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = map.get(key) ?? Promise.resolve()
  let release: () => void = () => undefined
  const gate = new Promise<void>(resolve => { release = resolve })
  const next = previous.then(() => gate)
  map.set(key, next)
  try {
    await previous.catch(() => undefined)
    return await fn()
  } finally {
    release()
    if (map.get(key) === next) map.delete(key)
  }
}

function asTrackId(id: number | string | undefined): string | null {
  if (id === undefined || id === null) return null
  const value = String(id)
  return value.length > 0 ? value : null
}

function numericResourceId(id: string): string | null {
  const trimmed = id.trim()
  const fromUrn = /^soundcloud:(?:tracks|playlists):(\d+)$/.exec(trimmed)
  if (fromUrn?.[1]) return fromUrn[1]
  return /^\d+$/.test(trimmed) ? trimmed : null
}

function playlistUrn(playlistId: string): string | null {
  const numeric = numericResourceId(playlistId)
  return numeric ? `soundcloud:playlists:${numeric}` : null
}

function trackUrn(trackId: string): string | null {
  const numeric = numericResourceId(trackId)
  return numeric ? `soundcloud:tracks:${numeric}` : null
}

/** SoundCloud artwork_url defaults to 100×100 (`-large`). Prefer 500px for covers. */
function upgradeArtworkUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  return url.replace('-large.', '-t500x500.')
}

function trackImageUrl(raw: SoundCloudTrack): string | undefined {
  return upgradeArtworkUrl(raw.artwork_url) ?? upgradeArtworkUrl(raw.user?.avatar_url)
}

function firstTrackImageUrl(tracks?: SoundCloudTrack[]): string | undefined {
  if (!tracks) return undefined
  for (const track of tracks) {
    const imageUrl = trackImageUrl(track)
    if (imageUrl) return imageUrl
  }
  return undefined
}

function mapTrack(raw: SoundCloudTrack): StreamingTrack | null {
  const id = asTrackId(raw.id)
  if (!id || !raw.title) return null
  const artist = (raw.metadata_artist?.trim() || raw.user?.username || 'Unknown Artist')
  return {
    id,
    title: raw.title,
    artist,
    durationMs: raw.duration ?? 0,
    imageUrl: trackImageUrl(raw),
    externalUrl: raw.permalink_url,
    isrc: raw.isrc?.trim() || undefined,
  }
}

function mapPlaylist(raw: SoundCloudPlaylist): StreamingPlaylist | null {
  const id = asTrackId(raw.id)
  if (!id || !raw.title) return null
  return {
    id,
    name: raw.title,
    description: raw.description ?? undefined,
    trackCount: raw.track_count ?? raw.tracks?.length ?? 0,
    imageUrl: upgradeArtworkUrl(raw.artwork_url) ?? firstTrackImageUrl(raw.tracks),
    externalUrl: raw.permalink_url,
  }
}

function authHeader(token: string): Record<string, string> {
  return {
    Authorization: `OAuth ${token}`,
    Accept: 'application/json; charset=utf-8',
  }
}

export class SoundCloudProvider implements StreamingProvider {
  readonly name = PROVIDER_NAME
  readonly displayName = 'SoundCloud'

  async getAuthUrl(
    userId: string,
    context: { returnOrigin?: string; redirectUri?: string } = {},
  ): Promise<string> {
    const callbackUri = context.redirectUri ?? redirectUri()
    const { verifier, challenge } = generatePkce()
    const state = generateState(userId, {
      returnOrigin: context.returnOrigin,
      redirectUri: callbackUri,
      codeVerifier: verifier,
    })
    const params = new URLSearchParams({
      client_id: clientId(),
      redirect_uri: callbackUri,
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      display: 'popup',
    })
    return `${AUTH}/authorize?${params.toString()}`
  }

  async handleCallback(code: string, state: string): Promise<{ providerUserId: string }> {
    const { userId, redirectUri: callbackUri, codeVerifier } = verifyState(state)
    if (!codeVerifier) throw new Error('SoundCloud OAuth state is missing the PKCE verifier')

    const tokenRes = await this.exchangeCode(code, callbackUri ?? redirectUri(), codeVerifier)
    const me = await this.fetchMe(tokenRes.access_token)
    const providerUserId = String(me.id)

    await storeTokens(userId, PROVIDER_NAME, {
      accessToken: tokenRes.access_token,
      refreshToken: tokenRes.refresh_token ?? null,
      expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
      providerUserId,
    })

    return { providerUserId }
  }

  async getPlaylists(userId: string): Promise<StreamingPlaylist[]> {
    const accessToken = await this.refreshTokenIfNeeded(userId)
    const playlists: StreamingPlaylist[] = []
    let url: string | null = `${API}/me/playlists?show_tracks=true&linked_partitioning=true&limit=50`

    while (url) {
      const res = await soundcloudFetch(url, { headers: authHeader(accessToken) })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`SoundCloud getPlaylists failed (${res.status}): ${body}`)
      }
      const data = (await res.json()) as CollectionResponse<SoundCloudPlaylist> | SoundCloudPlaylist[]
      const items = Array.isArray(data) ? data : (data.collection ?? [])
      for (const item of items) {
        const mapped = mapPlaylist(item)
        if (mapped) playlists.push(mapped)
      }
      url = Array.isArray(data) ? null : (data.next_href ?? null)
    }

    return playlists
  }

  async getPlaylist(userId: string, playlistId: string): Promise<StreamingPlaylist> {
    const accessToken = await this.refreshTokenIfNeeded(userId)
    const res = await soundcloudFetch(
      `${API}/playlists/${encodeURIComponent(playlistId)}`,
      { headers: authHeader(accessToken) },
    )
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`SoundCloud getPlaylist failed (${res.status}): ${body}`)
    }
    const mapped = mapPlaylist((await res.json()) as SoundCloudPlaylist)
    if (!mapped) throw new Error(`SoundCloud playlist ${playlistId} not found`)
    if (!mapped.imageUrl) {
      mapped.imageUrl = await this.firstTrackImage(accessToken, playlistId)
    }
    return mapped
  }

  async getPlaylistTracks(userId: string, playlistId: string): Promise<StreamingTrack[]> {
    const accessToken = await this.refreshTokenIfNeeded(userId)
    const tracks: StreamingTrack[] = []
    let url: string | null =
      `${API}/playlists/${encodeURIComponent(playlistId)}/tracks?linked_partitioning=true&limit=200`

    while (url) {
      const res = await soundcloudFetch(url, { headers: authHeader(accessToken) })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`SoundCloud getPlaylistTracks failed (${res.status}): ${body}`)
      }
      const data = (await res.json()) as CollectionResponse<SoundCloudTrack> | SoundCloudTrack[]
      const items = Array.isArray(data) ? data : (data.collection ?? [])
      for (const item of items) {
        const mapped = mapTrack(item)
        if (mapped) tracks.push(mapped)
      }
      url = Array.isArray(data) ? null : (data.next_href ?? null)
    }

    return tracks
  }

  async refreshTokenIfNeeded(userId: string): Promise<string> {
    const pending = refreshLocks.get(userId)
    if (pending) return pending
    const run = this.refreshUnlocked(userId).finally(() => refreshLocks.delete(userId))
    refreshLocks.set(userId, run)
    return run
  }

  async addTracksToPlaylist(
    userId: string,
    playlistId: string,
    trackIds: string[],
  ): Promise<{ added: number }> {
    if (trackIds.length === 0) return { added: 0 }
    return withLock(writeLocks, `${userId}:${playlistId}`, async () => {
      const current = await this.getPlaylistTracks(userId, playlistId)
      const existing = new Set(current.map(t => t.id))
      const merged = [...current.map(t => t.id)]
      let added = 0
      for (const id of trackIds) {
        if (existing.has(id)) continue
        existing.add(id)
        merged.push(id)
        added += 1
      }
      if (added === 0) return { added: 0 }
      await this.putPlaylistTracks(userId, playlistId, merged)
      return { added }
    })
  }

  async replacePlaylistTracks(
    userId: string,
    playlistId: string,
    trackIds: string[],
  ): Promise<{ written: number }> {
    return withLock(writeLocks, `${userId}:${playlistId}`, async () => {
      await this.putPlaylistTracks(userId, playlistId, trackIds)
      return { written: trackIds.length }
    })
  }

  async searchTrack(userId: string, query: TrackSearchQuery): Promise<TrackSearchResult> {
    const accessToken = await this.refreshTokenIfNeeded(userId)
    const q = `${query.title} ${query.artist}`.trim()
    const params = new URLSearchParams({
      q,
      access: 'playable',
      limit: '8',
      linked_partitioning: 'true',
    })
    const res = await soundcloudFetch(`${API}/tracks?${params.toString()}`, {
      headers: authHeader(accessToken),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`SoundCloud search failed (${res.status}): ${body}`)
    }
    const data = (await res.json()) as CollectionResponse<SoundCloudTrack> | SoundCloudTrack[]
    const items = Array.isArray(data) ? data : (data.collection ?? [])
    const candidates = items.map(mapTrack).filter((t): t is StreamingTrack => t !== null)
    return pickBestTrackMatch(query, candidates)
  }

  async disconnect(userId: string): Promise<void> {
    const stored = await getTokens(userId, PROVIDER_NAME)
    if (stored?.accessToken) {
      try {
        await soundcloudFetch(`${AUTH}/sign-out`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: stored.accessToken }),
        })
      } catch {
        // Best-effort sign-out; always delete local tokens.
      }
    }
    await deleteTokens(userId, PROVIDER_NAME)
  }

  private async refreshUnlocked(userId: string): Promise<string> {
    const stored = await getTokens(userId, PROVIDER_NAME)
    if (!stored) throw new Error(`User ${userId} has not connected SoundCloud`)

    const stillFresh = stored.expiresAt
      && stored.expiresAt.getTime() - Date.now() > REFRESH_BUFFER_MS
    if (stillFresh) return stored.accessToken
    if (!stored.refreshToken) {
      throw new Error('SoundCloud session expired. Reconnect SoundCloud in Settings.')
    }

    try {
      const tokenRes = await this.refreshAccessToken(stored.refreshToken)
      await storeTokens(userId, PROVIDER_NAME, {
        accessToken: tokenRes.access_token,
        refreshToken: tokenRes.refresh_token ?? stored.refreshToken,
        expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
        providerUserId: stored.providerUserId,
        providerEmail: stored.providerEmail,
      })
      return tokenRes.access_token
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('invalid_grant') || message.includes('(401)')) {
        await deleteTokens(userId, PROVIDER_NAME)
        throw new Error('SoundCloud session expired. Reconnect SoundCloud in Settings.')
      }
      throw err
    }
  }

  private async firstTrackImage(accessToken: string, playlistId: string): Promise<string | undefined> {
    const res = await soundcloudFetch(
      `${API}/playlists/${encodeURIComponent(playlistId)}/tracks?linked_partitioning=true&limit=20`,
      { headers: authHeader(accessToken) },
    )
    if (!res.ok) return undefined
    const data = (await res.json()) as CollectionResponse<SoundCloudTrack> | SoundCloudTrack[]
    const items = Array.isArray(data) ? data : (data.collection ?? [])
    return firstTrackImageUrl(items)
  }

  private async putPlaylistTracks(userId: string, playlistId: string, trackIds: string[]): Promise<void> {
    const accessToken = await this.refreshTokenIfNeeded(userId)
    const playlist = playlistUrn(playlistId)
    if (!playlist) throw new Error(`Invalid SoundCloud playlist id: ${playlistId}`)

    const tracks: Array<{ urn: string }> = []
    const skipped: string[] = []
    for (const id of trackIds) {
      const urn = trackUrn(id)
      if (!urn) {
        skipped.push(id)
        continue
      }
      tracks.push({ urn })
    }
    if (skipped.length > 0) {
      console.log(JSON.stringify({
        level: 'warn',
        message: 'SoundCloud skipped invalid track ids on playlist update',
        playlistId,
        skippedCount: skipped.length,
        skipped: skipped.slice(0, 8),
      }))
    }
    if (tracks.length === 0) {
      throw new Error('SoundCloud playlist update has no valid track URNs')
    }

    const res = await soundcloudFetch(`${API}/playlists/${playlist}`, {
      method: 'PUT',
      headers: {
        ...authHeader(accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playlist: { tracks } }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`SoundCloud update playlist failed (${res.status}): ${body}`)
    }
  }

  private async exchangeCode(code: string, callbackUri: string, codeVerifier: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: callbackUri,
      code_verifier: codeVerifier,
      code,
    })
    const res = await fetch(`${AUTH}/oauth/token`, {
      method: 'POST',
      headers: {
        accept: 'application/json; charset=utf-8',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`SoundCloud token exchange failed (${res.status}): ${text}`)
    }
    return (await res.json()) as TokenResponse
  }

  private async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId(),
      client_secret: clientSecret(),
      refresh_token: refreshToken,
    })
    const res = await fetch(`${AUTH}/oauth/token`, {
      method: 'POST',
      headers: {
        accept: 'application/json; charset=utf-8',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`SoundCloud token refresh failed (${res.status}): ${text}`)
    }
    return (await res.json()) as TokenResponse
  }

  private async fetchMe(accessToken: string): Promise<SoundCloudUser> {
    const res = await soundcloudFetch(`${API}/me`, { headers: authHeader(accessToken) })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`SoundCloud /me failed (${res.status}): ${text}`)
    }
    return (await res.json()) as SoundCloudUser
  }
}
