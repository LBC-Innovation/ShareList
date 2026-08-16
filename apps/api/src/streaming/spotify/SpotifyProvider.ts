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
import type { StreamingPlaylist, StreamingProvider, StreamingTrack } from '../types'

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
  tracks: { total: number } | null
  images: { url: string }[]
  external_urls: { spotify: string }
  public: boolean | null
}

interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylistItem[]
  next: string | null
}

interface SpotifyMeResponse {
  id: string
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
}

// Minimal — we only need `type` to filter episodes out
interface SpotifyEpisodeObject {
  type: 'episode'
  id: string
}

// ── Rate-limit-aware fetch ────────────────────────────────────────────────────

/**
 * Wraps fetch() with Retry-After / exponential-backoff handling for HTTP 429.
 * Per Spotify rules: respect the Retry-After header; never retry in a tight loop.
 */
async function spotifyFetch(url: string, init: RequestInit, attempt = 0): Promise<Response> {
  const res = await fetch(url, init)
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '1', 10)
    const waitMs = (isNaN(retryAfter) ? 1 : retryAfter) * 1000 * Math.pow(2, attempt)
    console.log(JSON.stringify({ level: 'warn', message: 'Spotify rate limited', retryAfterMs: waitMs, attempt }))
    await new Promise(r => setTimeout(r, waitMs))
    return spotifyFetch(url, init, attempt + 1)
  }
  return res
}

// ── Provider ──────────────────────────────────────────────────────────────────

/** Number of milliseconds before expiry at which we preemptively refresh. */
const REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 minutes

const PROVIDER_NAME = 'spotify'

export class SpotifyProvider implements StreamingProvider {
  readonly name = PROVIDER_NAME
  readonly displayName = 'Spotify'

  // ── OAuth ──────────────────────────────────────────────────────────────────

  async getAuthUrl(userId: string): Promise<string> {
    const state = generateState(userId)
    const scopes = [
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private',
    ].join(' ')

    const params = new URLSearchParams({
      client_id: clientId(),
      response_type: 'code',
      redirect_uri: redirectUri(),
      scope: scopes,
      state,
      show_dialog: 'true',
    })

    return `https://accounts.spotify.com/authorize?${params.toString()}`
  }

  async handleCallback(code: string, state: string): Promise<{ providerUserId: string }> {
    const userId = verifyState(state)

    // Exchange code for tokens
    const tokenRes = await this._exchangeCode(code)

    // Log the scopes Spotify actually granted — useful for diagnosing 403s
    console.log(JSON.stringify({
      level: 'info',
      message: 'Spotify token granted',
      userId,
      grantedScopes: tokenRes.scope ?? '(none returned)',
    }))

    // Fetch the Spotify user ID
    const me = await this._fetchMe(tokenRes.access_token)

    await storeTokens(userId, PROVIDER_NAME, {
      accessToken: tokenRes.access_token,
      refreshToken: tokenRes.refresh_token ?? null,
      expiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
      providerUserId: me.id,
    })

    return { providerUserId: me.id }
  }

  // ── Playlists ──────────────────────────────────────────────────────────────

  async getPlaylists(userId: string): Promise<StreamingPlaylist[]> {
    const accessToken = await this.refreshTokenIfNeeded(userId)
    const playlists: StreamingPlaylist[] = []
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
        playlists.push({
          id: item.id,
          name: item.name,
          description: item.description ?? undefined,
          // tracks.total from the listing endpoint is deprecated and unreliable —
          // Spotify frequently returns 0 here even for populated playlists.
          // We resolve accurate counts below via individual playlist calls.
          trackCount: item.tracks?.total ?? 0,
          imageUrl: item.images[0]?.url,
          externalUrl: item.external_urls.spotify,
        })
      }

      url = data.next
    }

    // The listing endpoint's tracks.total is deprecated and unreliable (often 0).
    // For any playlist still showing 0, use the /items paging endpoint with limit=1:
    // even fetching a single item returns an accurate `total` in the paging wrapper,
    // unlike the deprecated tracks.total metadata field.
    const needsCount = playlists.filter(p => p.trackCount === 0)
    if (needsCount.length > 0) {
      const results = await Promise.allSettled(
        needsCount.map(p =>
          spotifyFetch(
            `https://api.spotify.com/v1/playlists/${encodeURIComponent(p.id)}/items?limit=1&additional_types=track`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          ).then(r => r.json() as Promise<{ total?: number }>),
        ),
      )
      for (let i = 0; i < needsCount.length; i++) {
        const result = results[i]
        if (result.status === 'fulfilled' && typeof result.value.total === 'number') {
          needsCount[i].trackCount = result.value.total
        }
      }
    }

    return playlists
  }

  async getPlaylist(userId: string, playlistId: string): Promise<StreamingPlaylist> {
    const accessToken = await this.refreshTokenIfNeeded(userId)
    const res = await spotifyFetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}?fields=id,name,description,images,external_urls,tracks.total`,
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
      trackCount: data.tracks?.total ?? 0,
      imageUrl: data.images[0]?.url,
      externalUrl: data.external_urls.spotify,
    }
  }

  async getPlaylistTracks(userId: string, playlistId: string): Promise<StreamingTrack[]> {
    const accessToken = await this.refreshTokenIfNeeded(userId)
    const tracks: StreamingTrack[] = []

    // Use the current /items endpoint (not the deprecated /tracks endpoint).
    // The /items endpoint returns audio content in the `item` field; `track` is deprecated.
    let url: string | null =
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items` +
      `?limit=50&additional_types=track`

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
        console.log(JSON.stringify({ level: 'warn', message: 'Spotify items response missing items array', raw: JSON.stringify(raw as Record<string, unknown>).slice(0, 500) }))
        break
      }

      for (const item of data.items) {
        // `item.item` is the current field; fall back to deprecated `item.track`
        const audioObj = item.item ?? item.track
        if (!audioObj) continue                  // null = local file
        if (audioObj.type !== 'track') continue  // skip podcast episodes
        const t = audioObj as SpotifyTrackObject
        if (!t.id) continue
        tracks.push({
          id: t.id,
          title: t.name,
          artist: t.artists?.map(a => a.name).join(', ') ?? 'Unknown Artist',
          album: t.album?.name,
          durationMs: t.duration_ms,
          imageUrl: t.album?.images?.[0]?.url,
          externalUrl: t.external_urls?.spotify,
        })
      }
      url = data.next
    }
    return tracks
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
    const BATCH_SIZE = 100
    let added = 0

    for (let i = 0; i < trackIds.length; i += BATCH_SIZE) {
      const batch = trackIds.slice(i, i + BATCH_SIZE)
      const uris = batch.map(id => `spotify:track:${id}`)

      const res = await spotifyFetch(
        `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uris }),
        },
      )

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Spotify addTracksToPlaylist failed (${res.status}): ${body}`)
      }

      added += batch.length
    }

    return { added }
  }

  async disconnect(userId: string): Promise<void> {
    await deleteTokens(userId, PROVIDER_NAME)
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async _exchangeCode(code: string): Promise<SpotifyTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
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
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Spotify /me failed (${res.status}): ${text}`)
    }

    return (await res.json()) as SpotifyMeResponse
  }
}
