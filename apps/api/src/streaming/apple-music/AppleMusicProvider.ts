/**
 * Apple Music streaming provider.
 *
 * Auth flow: MusicKit JS two-token system.
 *   1. The API generates a short-lived ES256 developer token (JWT signed with
 *      the team's .p8 private key).
 *   2. The frontend loads MusicKit JS with that developer token, prompts the
 *      user for permission, and receives a Music User Token.
 *   3. The frontend POSTs the Music User Token back to the API callback
 *      endpoint, which persists it.
 *
 * Apple Music user tokens do not expire on a fixed schedule — Apple may
 * invalidate them, but there is no standard expiry or refresh flow. We store
 * them without an expiresAt.
 *
 * Env vars required:
 *   APPLE_MUSIC_TEAM_ID   — 10-char Apple Developer Team ID
 *   APPLE_MUSIC_KEY_ID    — Key ID from the MusicKit identifier
 *   APPLE_MUSIC_PRIVATE_KEY — Full contents of the .p8 file (newlines as \n)
 */

import jwt from 'jsonwebtoken'
import {
  generateState,
  verifyState,
  storeTokens,
  getTokens,
  deleteTokens,
} from '../oauthHelpers'
import type { StreamingPlaylist, StreamingProvider, StreamingTrack } from '../types'

// ── Env helpers ───────────────────────────────────────────────────────────────

function teamId(): string {
  const v = process.env['APPLE_MUSIC_TEAM_ID']
  if (!v) throw new Error('APPLE_MUSIC_TEAM_ID env var is not set')
  return v
}

function keyId(): string {
  const v = process.env['APPLE_MUSIC_KEY_ID']
  if (!v) throw new Error('APPLE_MUSIC_KEY_ID env var is not set')
  return v
}

function privateKey(): string {
  const v = process.env['APPLE_MUSIC_PRIVATE_KEY']
  if (!v) throw new Error('APPLE_MUSIC_PRIVATE_KEY env var is not set')
  // Env vars store literal \n — convert to real newlines
  return v.replace(/\\n/g, '\n')
}

// ── Apple Music API types (minimal) ──────────────────────────────────────────

interface AppleMusicPlaylist {
  id: string
  attributes: {
    name: string
    description?: { standard?: string }
    trackCount?: number         // present on library playlists
    artwork?: { url: string }   // template URL, replace {w}x{h} placeholders
    playParams?: { id: string }
  }
}

interface AppleMusicPlaylistsResponse {
  data: AppleMusicPlaylist[]
  next?: string
}

// ── Developer token ───────────────────────────────────────────────────────────

/** Developer token TTL — Apple allows up to 6 months; we use 12 hours. */
const DEV_TOKEN_TTL_SECONDS = 12 * 60 * 60

/**
 * Generates a signed ES256 developer token.
 * Called on every auth-URL request so it is always fresh.
 */
function generateDeveloperToken(): string {
  return jwt.sign({}, privateKey(), {
    algorithm: 'ES256',
    expiresIn: DEV_TOKEN_TTL_SECONDS,
    issuer: teamId(),
    header: {
      alg: 'ES256',
      kid: keyId(),
    },
  })
}

// ── Provider ──────────────────────────────────────────────────────────────────

const PROVIDER_NAME = 'apple_music'

export class AppleMusicProvider implements StreamingProvider {
  readonly name = PROVIDER_NAME
  readonly displayName = 'Apple Music'

  // ── OAuth / auth ───────────────────────────────────────────────────────────

  /**
   * Returns a JSON-encoded sentinel string that the frontend detects to run
   * the MusicKit JS flow instead of a redirect.
   *
   * Shape: `{ url: 'apple-music://authorize', state, developerToken }`
   */
  async getAuthUrl(userId: string): Promise<string> {
    const state = generateState(userId)
    const developerToken = generateDeveloperToken()

    return JSON.stringify({
      url: 'apple-music://authorize',
      state,
      developerToken,
    })
  }

  /**
   * Persists the Music User Token received from the frontend.
   * `code`  — the Music User Token returned by MusicKit JS
   * `state` — the HMAC-signed state generated in getAuthUrl
   */
  async handleCallback(code: string, state: string): Promise<{ providerUserId: string }> {
    const userId = verifyState(state)

    // Fetch the storefront user ID from the Apple Music API
    const developerToken = generateDeveloperToken()
    const providerUserId = await this._fetchStorefrontUserId(code, developerToken)

    await storeTokens(userId, PROVIDER_NAME, {
      accessToken: code,        // Music User Token IS the access credential
      refreshToken: null,       // no refresh flow for Apple Music
      expiresAt: null,          // no fixed expiry
      providerUserId,
    })

    return { providerUserId }
  }

  // ── Playlists ──────────────────────────────────────────────────────────────

  async getPlaylists(userId: string): Promise<StreamingPlaylist[]> {
    // refreshTokenIfNeeded is a no-op for Apple Music, but we call it
    // consistently to retrieve the access token via the same path.
    const musicUserToken = await this.refreshTokenIfNeeded(userId)
    const developerToken = generateDeveloperToken()

    const playlists: StreamingPlaylist[] = []
    let url: string | null =
      'https://api.music.apple.com/v1/me/library/playlists?limit=100'

    while (url) {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${developerToken}`,
          'Music-User-Token': musicUserToken,
        },
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Apple Music getPlaylists failed (${res.status}): ${body}`)
      }

      const data = (await res.json()) as AppleMusicPlaylistsResponse

      for (const item of data.data) {
        const attrs = item.attributes
        // Artwork URL uses {w}x{h} template — request 300×300
        const rawArt = attrs.artwork?.url
        const imageUrl = rawArt
          ? rawArt.replace('{w}', '300').replace('{h}', '300')
          : undefined

        playlists.push({
          id: item.id,
          name: attrs.name,
          description: attrs.description?.standard,
          trackCount: attrs.trackCount ?? 0,
          imageUrl,
          // Apple Music library playlists have no public deep-link
          externalUrl: undefined,
        })
      }

      url = data.next
        ? `https://api.music.apple.com${data.next}`
        : null
    }

    return playlists
  }

  async getPlaylist(userId: string, playlistId: string): Promise<StreamingPlaylist> {
    const musicUserToken = await this.refreshTokenIfNeeded(userId)
    const developerToken = generateDeveloperToken()
    const res = await fetch(
      `https://api.music.apple.com/v1/me/library/playlists/${encodeURIComponent(playlistId)}`,
      {
        headers: {
          Authorization: `Bearer ${developerToken}`,
          'Music-User-Token': musicUserToken,
        },
      },
    )
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Apple Music getPlaylist failed (${res.status}): ${body}`)
    }
    const data = (await res.json()) as AppleMusicPlaylistsResponse
    const item = data.data[0]
    if (!item) throw new Error(`Apple Music playlist ${playlistId} not found`)
    const attrs = item.attributes
    const rawArt = attrs.artwork?.url
    return {
      id: item.id,
      name: attrs.name,
      description: attrs.description?.standard,
      trackCount: attrs.trackCount ?? 0,
      imageUrl: rawArt ? rawArt.replace('{w}', '300').replace('{h}', '300') : undefined,
      externalUrl: undefined,
    }
  }

  async getPlaylistTracks(userId: string, playlistId: string): Promise<StreamingTrack[]> {
    const musicUserToken = await this.refreshTokenIfNeeded(userId)
    const developerToken = generateDeveloperToken()
    const tracks: StreamingTrack[] = []
    let url: string | null = `https://api.music.apple.com/v1/me/library/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100`

    while (url) {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${developerToken}`,
          'Music-User-Token': musicUserToken,
        },
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Apple Music getPlaylistTracks failed (${res.status}): ${body}`)
      }
      interface AMTrack {
        id: string
        attributes: {
          name: string
          artistName?: string
          albumName?: string
          durationInMillis?: number
          artwork?: { url: string }
        }
      }
      interface AMTracksResponse { data: AMTrack[]; next?: string }
      const data = (await res.json()) as AMTracksResponse
      for (const item of data.data) {
        const a = item.attributes
        const rawArt = a.artwork?.url
        const imageUrl = rawArt ? rawArt.replace('{w}', '300').replace('{h}', '300') : undefined
        tracks.push({
          id: item.id,
          title: a.name,
          artist: a.artistName ?? '',
          album: a.albumName,
          durationMs: a.durationInMillis ?? 0,
          imageUrl,
          externalUrl: undefined,
        })
      }
      url = data.next ? `https://api.music.apple.com${data.next}` : null
    }
    return tracks
  }

  // ── Token management ───────────────────────────────────────────────────────

  /**
   * No-op for Apple Music — user tokens have no standard expiry or refresh
   * mechanism. Returns the stored Music User Token unchanged.
   */
  async refreshTokenIfNeeded(userId: string): Promise<string> {
    const stored = await getTokens(userId, PROVIDER_NAME)
    if (!stored) throw new Error(`User ${userId} has not connected Apple Music`)
    return stored.accessToken
  }

  /**
   * Not yet implemented for Apple Music.
   *
   * Apple Music library write APIs require a different auth scope and are
   * deferred to a future story. This stub satisfies the StreamingProvider
   * interface and surfaces a clear error if called unexpectedly.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addTracksToPlaylist(_userId: string, _playlistId: string, _trackIds: string[]): Promise<{ added: number }> {
    throw new Error('addTracksToPlaylist is not yet implemented for Apple Music')
  }

  async disconnect(userId: string): Promise<void> {
    await deleteTokens(userId, PROVIDER_NAME)
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Calls the Apple Music API to retrieve the user's storefront identifier.
   * This serves as our stable providerUserId for Apple Music.
   */
  private async _fetchStorefrontUserId(
    musicUserToken: string,
    developerToken: string,
  ): Promise<string> {
    const res = await fetch('https://api.music.apple.com/v1/me/storefront', {
      headers: {
        Authorization: `Bearer ${developerToken}`,
        'Music-User-Token': musicUserToken,
      },
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Apple Music storefront fetch failed (${res.status}): ${body}`)
    }

    interface StorefrontResponse {
      data: { id: string }[]
    }

    const data = (await res.json()) as StorefrontResponse
    const storefrontId = data.data[0]?.id
    if (!storefrontId) throw new Error('Apple Music storefront response missing id')
    return storefrontId
  }
}
