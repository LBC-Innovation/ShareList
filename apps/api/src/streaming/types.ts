/** Normalised playlist shape returned by every streaming provider. */
export interface StreamingPlaylist {
  id: string
  name: string
  description?: string
  trackCount: number
  imageUrl?: string
  externalUrl?: string
}

/** A single track returned by a streaming provider's playlist. */
export interface StreamingTrack {
  id: string
  title: string
  artist: string
  album?: string
  durationMs: number
  imageUrl?: string
  externalUrl?: string
}

/**
 * Contract that every streaming provider module must implement.
 *
 * Provider modules are self-contained: each imports the shared helpers from
 * oauthHelpers.ts and registers itself via registry.ts. The route layer never
 * imports a provider directly — it calls getProvider(name) from the registry.
 */
export interface StreamingProvider {
  /** Stable identifier, e.g. 'spotify' | 'apple_music' */
  readonly name: string
  /** Human-readable label for UI display, e.g. 'Spotify' | 'Apple Music' */
  readonly displayName: string

  /**
   * Returns the URL the frontend should navigate to in order to start the
   * OAuth / auth flow.
   *
   * For redirect-based providers (Spotify): a standard OAuth authorize URL.
   * For in-page providers (Apple Music): a JSON-encoded sentinel object
   *   `{ url: 'apple-music://authorize', state, developerToken }` so the
   *   frontend can detect the special case and run MusicKit JS instead.
   */
  getAuthUrl(userId: string): Promise<string>

  /**
   * Exchanges an auth code for tokens and persists them to connected_services.
   *
   * For redirect providers: code is the OAuth authorization code.
   * For Apple Music: code is the MusicKit user music token.
   * Returns the provider's own user ID for storage.
   */
  handleCallback(code: string, state: string): Promise<{ providerUserId: string }>

  /** Fetch the user's playlists from the provider, refreshing tokens as needed. */
  getPlaylists(userId: string): Promise<StreamingPlaylist[]>

  /** Fetch current metadata (name, image, track count) for a single playlist. */
  getPlaylist(userId: string, playlistId: string): Promise<StreamingPlaylist>

  /** Fetch all tracks from a specific playlist, paginating as needed. */
  getPlaylistTracks(userId: string, playlistId: string): Promise<StreamingTrack[]>

  /**
   * Refreshes the access token if it is close to expiry.
   * Returns the current valid access token (refreshed or existing).
   * No-op for providers whose tokens do not expire.
   */
  refreshTokenIfNeeded(userId: string): Promise<string>

  /**
   * Adds tracks to a playlist on the provider.
   *
   * `trackIds` are the provider-native track IDs (e.g. Spotify track IDs —
   * the service is responsible for converting them to the required URI format).
   *
   * Returns the number of tracks actually added (may be less than
   * `trackIds.length` if some were already present or rejected by the provider).
   *
   * Providers that do not yet support writing should throw with a clear message.
   */
  addTracksToPlaylist(
    userId: string,
    playlistId: string,
    trackIds: string[],
  ): Promise<{ added: number }>

  /** Removes all stored tokens for this user / provider pair. */
  disconnect(userId: string): Promise<void>
}
