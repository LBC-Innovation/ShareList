/**
 * Spotify streaming provider.
 *
 * Auth flow: standard OAuth 2.0 Authorization Code with PKCE-free server-side
 * exchange. Access tokens expire in 1 hour; refresh tokens are long-lived.
 *
 * Env vars required:
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *   SPOTIFY_REDIRECT_URI
 */

import {
  generateState,
  verifyState,
  storeTokens,
  getTokens,
  deleteTokens,
} from '../oauthHelpers'
import { invalidateSpotifyGetCache, spotifyFetch } from './spotifyHttp'
import type { StreamingPlaylist, StreamingProvider, StreamingTrack, TrackSearchQuery, TrackSearchResult } from '../types'
import { pickBestTrackMatch } from '../../services/trackMatchScore'

// ── Env helpers ───────────────────────────────────────────────────────────────

function clientId(): string {
  const v = process.env['SPOTIFY_CLIENT_ID']
  if (!v) throw new Error('SPOTIFY_CLIENT_ID env var is not set')
  return v
}

function clientSecret(): string {
  const v = process.env['SPOTIFY_CLIENT_SECRET']
  if (!v) throw new Error('SPOTIFY_CLIENT_SECRET env var is not set')
  return v
}

function redirectUri(): string {
  const v = process.env['SPOTIFY_REDIRECT_URI']
  if (!v) throw new Error('SPOTIFY_REDIRECT_URI env var is not set')
  return v
}

// ── Spotify API types (minimal) ───────────────────────────────────────────────

interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
}

interface SpotifyPlaylistItem {
  id: string
  name: string
  description: string | null
  collaborative?: boolean | null
  owner?: { id: string } | null
  // Feb 2026 renamed tracks → items; listing responses may still send tracks.total
  tracks?: SpotifyPlaylistItemsResponse | { total?: number } | null
  items?: SpotifyPlaylistItemsResponse | { total?: number } | null
  images: { url: string }[] | null
  external_urls: { spotify: string } | null
  public: boolean | null
}

interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylistItem[]
  next: string | null
}

interface SpotifyMeResponse {
  id: string
  email?: string | null
}

// Response type for GET /playlists/{id}/items (current, non-deprecated endpoint)
interface SpotifyPlaylistItemsResponse {
  // `item` is the current field name; `track` is the deprecated fallback
  items: Array<{
    item?: SpotifyTrackObject | SpotifyEpisodeObject | null
    track?: SpotifyTrackObject | SpotifyEpisodeObject | null // deprecated — kept for safety
    is_local: boolean
  }> | null
  total?: number
  next: string | null
}

interface SpotifyTrackObject {
  type: 'track'
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string; images: { url: string }[] }
  duration_ms: number
  external_urls: { spotify: string }
  external_ids?: { isrc?: string }
}

// Minimal — we only need `type` to filter episodes out
interface SpotifyEpisodeObject {
  type: 'episode'
  id: string
}

function playlistTrackCount(
  item: { tracks?: { total?: number } | null; items?: { total?: number } | null },
): number {
  return item.items?.total ?? item.tracks?.total ?? 0
}

function canReadPlaylistItems(
  playlist: SpotifyPlaylistItem,
  spotifyUserId: string | null | undefined,
): boolean {
  if (playlist.collaborative === true) return true
  if (spotifyUserId && playlist.owner?.id === spotifyUserId) return true
  return false
}

function asItemPaging(
  value: SpotifyPlaylistItem['items'] | SpotifyPlaylistItem['tracks'],
): SpotifyPlaylistItemsResponse | null {
  if (!value || !('items' in value) || !Array.isArray(value.items)) return null
  return value as SpotifyPlaylistItemsResponse
}

function tracksFromPaging(data: SpotifyPlaylistItemsResponse): StreamingTrack[] {
  const tracks: StreamingTrack[] = []
  if (!Array.isArray(data.items)) return tracks

  for (const item of data.items) {
    const audioObj = item.item ?? item.track
    if (!audioObj) continue
    if (audioObj.type !== 'track') continue
    const t = audioObj as SpotifyTrackObject
    if (!t.id) continue
    tracks.push(mapSpotifyTrack(t))
  }
  return tracks
}

function mapSpotifyTrack(t: SpotifyTrackObject): StreamingTrack {
  return {
    id: t.id,
    title: t.name,
    artist: t.artists?.map(a => a.name).join(', ') ?? 'Unknown Artist',
    album: t.album?.name,
    durationMs: t.duration_ms,
    imageUrl: t.album?.images?.[0]?.url,
    externalUrl: t.external_urls?.spotify,
    isrc: t.external_ids?.isrc,
  }
}

function searchTracksFromResponse(raw: unknown): StreamingTrack[] {
  const tracks = (raw as { tracks?: { items?: SpotifyTrackObject[] } }).tracks?.items ?? []
  return tracks.filter(t => t?.type === 'track' && t.id).map(mapSpotifyTrack)
}

function unreadablePlaylistError(playlistId: string): Error {
  return new Error(
    `Spotify cannot read tracks from playlist ${playlistId}. The connected account must own it or be a collaborator.`,
  )
}

const PLAYLIST_CACHE_TTL_MS = 45_000

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const playlistsCache = new Map<string, CacheEntry<StreamingPlaylist[]>>()
const tracksCache = new Map<string, CacheEntry<StreamingTrack[]>>()
const inflightTracks = new Map<string, Promise<StreamingTrack[]>>()
const inflightPlaylists = new Map<string, Promise<StreamingPlaylist[]>>()

function cacheGet<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = map.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    map.delete(key)
    return undefined
  }
  return entry.value
}

function cacheSet<T>(map: Map<string, CacheEntry<T>>, key: string, value: T): void {
  map.set(key, { value, expiresAt: Date.now() + PLAYLIST_CACHE_TTL_MS })
}

function invalidatePlaylistData(playlistId: string): void {
  invalidateSpotifyGetCache(playlistId)
  for (const key of [...tracksCache.keys()]) {
    if (key.endsWith(`:${playlistId}`)) tracksCache.delete(key)
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

/** Number of milliseconds before expiry at which we preemptively refresh. */
const REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 minutes
const ITEM_BATCH_SIZE = 100

const PROVIDER_NAME = 'spotify'

function normalizeEmail(value: string | null | undefined): string | null {
  const email = value?.trim()
  return email && email.includes('@') ? email : null
}

export class SpotifyProvider implements StreamingProvider {
  readonly name = PROVIDER_NAME
  readonly displayName = 'Spotify'

  // ── OAuth ──────────────────────────────────────────────────────────────────

  async getAuthUrl(
    userId: string,
    context: { returnOrigin?: string; redirectUri?: string } = {},
  ): Promise<string> {
    const callbackUri = context.redirectUri ?? redirectUri()
    const state = generateState(userId, {
      returnOrigin: context.returnOrigin,
      redirectUri: callbackUri,
    })
    const scopes = [
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private',
    ].join(' ')

    const params = new URLSearchParams({
      client_id: clientId(),
      response_type: 'code',
      redirect_uri: callbackUri,
      scope: scopes,
      state,
      show_dialog: 'true',
    })

    return `https://accounts.spotify.com/authorize?${params.toString()}`
  }

  async handleCallback(code: string, state: string): Promise<{ providerUserId: string }> {
    const { userId, redirectUri: callbackUri } = verifyState(state)

    // Exchange code for tokens — redirect_uri must match the authorize request
    const tokenRes = await this._exchangeCode(code, callbackUri ?? redirectUri())

    // Log the scopes Spotify actually granted — useful for diagnosing 403s
    console.log(JSON.stringify({
      level: 'info',
      message: 'Spotify token granted',
      userId,
      grantedScopes: tokenRes.scope ?? '(none returned)',
    }))

    // Fetch the Spotify user ID
    const me = await this._fetchMe(tokenRes.access_token)
    const providerEmail = normalizeEmail(me.email)

    await storeTokens(userId, PROVIDER_NAME, {
      accessToken: tokenRes.access_token,
      refreshToken: tokenRes.refresh_token ?? null,
      expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
      providerUserId: me.id,
      providerEmail,
    })

    return { providerUserId: me.id }
  }

  async syncAccountEmail(userId: string): Promise<string | null> {
    const accessToken = await this.refreshTokenIfNeeded(userId)
    const stored = await getTokens(userId, PROVIDER_NAME)
    if (stored?.providerEmail) return stored.providerEmail

    const me = await this._fetchMe(accessToken)
    const providerEmail = normalizeEmail(me.email)
    if (!providerEmail || !stored) return providerEmail

    await storeTokens(userId, PROVIDER_NAME, {
      accessToken,
      refreshToken: stored.refreshToken,
      expiresAt: stored.expiresAt,
      providerUserId: stored.providerUserId ?? me.id,
      providerEmail,
    })
    return providerEmail
  }

  // ── Playlists ──────────────────────────────────────────────────────────────

  async getPlaylists(userId: string): Promise<StreamingPlaylist[]> {
    const cached = cacheGet(playlistsCache, userId)
    if (cached) return cached
    const pending = inflightPlaylists.get(userId)
    if (pending) return pending

    const load = this.loadPlaylists(userId).then(playlists => {
      cacheSet(playlistsCache, userId, playlists)
      return playlists
    }).finally(() => inflightPlaylists.delete(userId))
    inflightPlaylists.set(userId, load)
    return load
  }

  private async loadPlaylists(userId: string): Promise<StreamingPlaylist[]> {
    const accessToken = await this.refreshTokenIfNeeded(userId)
    const stored = await getTokens(userId, PROVIDER_NAME)
    let mySpotifyId = stored?.providerUserId ?? null
    if (!mySpotifyId) {
      mySpotifyId = (await this._fetchMe(accessToken)).id
    }

    const playlists: StreamingPlaylist[] = []
    let skippedUnreadable = 0
    let url: string | null = 'https://api.spotify.com/v1/me/playlists?limit=50'

    while (url) {
      const res = await spotifyFetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Spotify getPlaylists failed (${res.status}): ${body}`)
      }

      const data = (await res.json()) as SpotifyPlaylistsResponse

      for (const item of data.items) {
        if (!item?.id) continue  // skip null/empty entries
        // GET /items 403s for followed playlists the user does not own or collaborate on.
        if (item.owner?.id && !canReadPlaylistItems(item, mySpotifyId)) {
          skippedUnreadable += 1
          continue
        }
        playlists.push({
          id: item.id,
          name: item.name,
          description: item.description ?? undefined,
          trackCount: playlistTrackCount(item),
          imageUrl: item.images?.[0]?.url,
          externalUrl: item.external_urls?.spotify,
        })
      }

      url = data.next
    }

    if (skippedUnreadable > 0) {
      console.log(JSON.stringify({
        level: 'info',
        message: 'Skipped Spotify playlists the connected account cannot read',
        userId,
        skippedUnreadable,
      }))
    }

    return playlists
  }

  async getPlaylist(userId: string, playlistId: string): Promise<StreamingPlaylist> {
    const accessToken = await this.refreshTokenIfNeeded(userId)
    const res = await spotifyFetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}?fields=id,name,description,images,external_urls,items.total`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Spotify getPlaylist failed (${res.status}): ${body}`)
    }
    const data = (await res.json()) as SpotifyPlaylistItem
    return {
      id: data.id,
      name: data.name,
      description: data.description ?? undefined,
      trackCount: playlistTrackCount(data),
      imageUrl: data.images?.[0]?.url,
      externalUrl: data.external_urls?.spotify,
    }
  }

  async getPlaylistTracks(userId: string, playlistId: string): Promise<StreamingTrack[]> {
    const key = `${userId}:${playlistId}`
    const cached = cacheGet(tracksCache, key)
    if (cached) return cached
    const pending = inflightTracks.get(key)
    if (pending) return pending

    const load = this.loadPlaylistTracks(userId, playlistId).then(tracks => {
      cacheSet(tracksCache, key, tracks)
      return tracks
    }).finally(() => inflightTracks.delete(key))
    inflightTracks.set(key, load)
    return load
  }

  private async loadPlaylistTracks(userId: string, playlistId: string): Promise<StreamingTrack[]> {
    const accessToken = await this.refreshTokenIfNeeded(userId)
    const itemsUrl =
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items?limit=50`

    try {
      return await this.fetchItemPages(accessToken, itemsUrl, playlistId)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!message.includes('(403)')) throw err
      console.log(JSON.stringify({
        level: 'warn',
        message: 'Spotify /items forbidden; falling back to playlist document',
        playlistId,
      }))
      return this.fetchTracksFromPlaylistDocument(accessToken, playlistId)
    }
  }

  // ── Token management ───────────────────────────────────────────────────────

  async refreshTokenIfNeeded(userId: string): Promise<string> {
    const stored = await getTokens(userId, PROVIDER_NAME)
    if (!stored) throw new Error(`User ${userId} has not connected Spotify`)

    const needsRefresh =
      stored.expiresAt !== null &&
      stored.expiresAt.getTime() - Date.now() < REFRESH_BUFFER_MS

    if (!needsRefresh) return stored.accessToken
    if (!stored.refreshToken) throw new Error('Spotify token expired and no refresh token available')

    const tokenRes = await this._refreshAccessToken(stored.refreshToken)

    await storeTokens(userId, PROVIDER_NAME, {
      accessToken: tokenRes.access_token,
      // Spotify may or may not return a new refresh token
      refreshToken: tokenRes.refresh_token ?? stored.refreshToken,
      expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
      providerUserId: stored.providerUserId,
      providerEmail: stored.providerEmail,
    })

    return tokenRes.access_token
  }

  /**
   * Adds tracks to a Spotify playlist via POST /playlists/{id}/items.
   *
   * Spotify accepts at most 100 URIs per request. We batch accordingly.
   * Track IDs are converted to spotify:track:{id} URI format as required by
   * the API — https://developer.spotify.com/reference/web-api/open-api-schema.yaml
   *
   * Returns the total number of tracks accepted across all batches.
   */
  async addTracksToPlaylist(
    userId: string,
    playlistId: string,
    trackIds: string[],
  ): Promise<{ added: number }> {
    if (trackIds.length === 0) return { added: 0 }

    const accessToken = await this.refreshTokenIfNeeded(userId)
    let added = 0

    for (let i = 0; i < trackIds.length; i += ITEM_BATCH_SIZE) {
      const batch = trackIds.slice(i, i + ITEM_BATCH_SIZE)
      await this.writePlaylistItems(accessToken, playlistId, batch, 'POST')
      added += batch.length
    }

    invalidatePlaylistData(playlistId)
    playlistsCache.delete(userId)
    return { added }
  }

  /**
   * Replaces a playlist's items with `trackIds` in order.
   * PUT /items accepts at most 100 URIs; remaining tracks are appended in batches.
   * Spotify removed PUT /playlists/{id}/tracks in the February 2026 API migration.
   */
  async replacePlaylistTracks(
    userId: string,
    playlistId: string,
    trackIds: string[],
  ): Promise<{ written: number }> {
    if (trackIds.length === 0) return { written: 0 }

    const accessToken = await this.refreshTokenIfNeeded(userId)
    const first = trackIds.slice(0, ITEM_BATCH_SIZE)
    await this.writePlaylistItems(accessToken, playlistId, first, 'PUT')

    let written = first.length
    for (let i = ITEM_BATCH_SIZE; i < trackIds.length; i += ITEM_BATCH_SIZE) {
      const batch = trackIds.slice(i, i + ITEM_BATCH_SIZE)
      await this.writePlaylistItems(accessToken, playlistId, batch, 'POST')
      written += batch.length
    }

    invalidatePlaylistData(playlistId)
    playlistsCache.delete(userId)
    return { written }
  }

  async searchTrack(userId: string, query: TrackSearchQuery): Promise<TrackSearchResult> {
    const accessToken = await this.refreshTokenIfNeeded(userId)
    const headers = { Authorization: `Bearer ${accessToken}` }

    if (query.isrc) {
      const isrcParams = new URLSearchParams({
        q: `isrc:${query.isrc.trim()}`,
        type: 'track',
        limit: '5',
      })
      const isrcRes = await spotifyFetch(`https://api.spotify.com/v1/search?${isrcParams.toString()}`, { headers })
      if (isrcRes.ok) {
        const hits = searchTracksFromResponse(await isrcRes.json())
        if (hits.length === 1 && hits[0]) {
          return { status: 'matched', track: hits[0], method: 'isrc' }
        }
        if (hits.length > 1) return { status: 'ambiguous' }
      }
    }

    const metaParams = new URLSearchParams({
      q: `track:${query.title} artist:${query.artist}`,
      type: 'track',
      limit: '8',
    })
    const res = await spotifyFetch(`https://api.spotify.com/v1/search?${metaParams.toString()}`, { headers })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Spotify search failed (${res.status}): ${body}`)
    }
    return pickBestTrackMatch(query, searchTracksFromResponse(await res.json()))
  }

  async disconnect(userId: string): Promise<void> {
    playlistsCache.delete(userId)
    for (const key of [...tracksCache.keys()]) {
      if (key.startsWith(`${userId}:`)) tracksCache.delete(key)
    }
    await deleteTokens(userId, PROVIDER_NAME)
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async fetchItemPages(
    accessToken: string,
    firstUrl: string,
    playlistId: string,
  ): Promise<StreamingTrack[]> {
    const tracks: StreamingTrack[] = []
    let url: string | null = firstUrl

    while (url) {
      const res = await spotifyFetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Spotify getPlaylistTracks failed (${res.status}): ${body}`)
      }

      const raw = await res.json() as unknown
      const data = raw as SpotifyPlaylistItemsResponse

      console.log(JSON.stringify({
        level: 'debug',
        message: 'Spotify items page',
        playlistId,
        total: (raw as Record<string, unknown>)['total'],
        itemCount: Array.isArray(data.items) ? data.items.length : 'not-array',
        nextPresent: !!data.next,
      }))

      if (!Array.isArray(data.items)) {
        console.log(JSON.stringify({
          level: 'warn',
          message: 'Spotify items response missing items array',
          playlistId,
          raw: JSON.stringify(raw as Record<string, unknown>).slice(0, 500),
        }))
        break
      }

      tracks.push(...tracksFromPaging(data))
      url = data.next
    }

    return tracks
  }

  /**
   * GET /playlists/{id} still returns metadata when /items 403s. Owned and
   * collaborative playlists include a nested items page we can use.
   */
  private async fetchTracksFromPlaylistDocument(
    accessToken: string,
    playlistId: string,
  ): Promise<StreamingTrack[]> {
    const res = await spotifyFetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Spotify getPlaylistTracks failed (${res.status}): ${body}`)
    }

    const data = (await res.json()) as SpotifyPlaylistItem
    const paging = asItemPaging(data.items) ?? asItemPaging(data.tracks)
    if (!paging) throw unreadablePlaylistError(playlistId)

    const tracks = tracksFromPaging(paging)
    if (paging.next) {
      try {
        tracks.push(...await this.fetchItemPages(accessToken, paging.next, playlistId))
      } catch (err) {
        console.log(JSON.stringify({
          level: 'warn',
          message: 'Spotify playlist document next page failed; returning first page',
          playlistId,
          error: err instanceof Error ? err.message : String(err),
        }))
      }
    }

    return tracks
  }

  /** POST appends items; PUT replaces the playlist with the given URIs. */
  private async writePlaylistItems(
    accessToken: string,
    playlistId: string,
    trackIds: string[],
    method: 'POST' | 'PUT',
  ): Promise<void> {
    const res = await spotifyFetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items`,
      {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: trackIds.map(id => `spotify:track:${id}`) }),
      },
    )

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Spotify playlist items ${method} failed (${res.status}): ${body}`)
    }
  }

  private async _exchangeCode(code: string, callbackUri: string): Promise<SpotifyTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUri,
    })

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId()}:${clientSecret()}`).toString('base64')}`,
      },
      body: body.toString(),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Spotify token exchange failed (${res.status}): ${text}`)
    }

    return (await res.json()) as SpotifyTokenResponse
  }

  private async _refreshAccessToken(refreshToken: string): Promise<SpotifyTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId()}:${clientSecret()}`).toString('base64')}`,
      },
      body: body.toString(),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Spotify token refresh failed (${res.status}): ${text}`)
    }

    return (await res.json()) as SpotifyTokenResponse
  }

  private async _fetchMe(accessToken: string): Promise<SpotifyMeResponse> {
    const res = await spotifyFetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Spotify /me failed (${res.status}): ${text}`)
    }

    return (await res.json()) as SpotifyMeResponse
  }
}
