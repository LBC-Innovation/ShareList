// ─── Platforms ────────────────────────────────────────────────────────────────

export type Platform = 'spotify' | 'apple_music' | 'youtube_music'

// ─── Core domain types ────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  connectedPlatforms: Platform[]
  createdAt: string
  role: string
  permissions: string[]
}

export interface Track {
  id: string
  title: string
  artist: string
  album?: string
  durationMs: number
  /** Platform-specific IDs for cross-platform matching */
  platformIds: Partial<Record<Platform, string>>
}

export interface Playlist {
  id: string
  title: string
  description?: string
  ownerId: string
  sourcePlatform: Platform
  tracks: Track[]
  coverUrl?: string
  createdAt: string
  updatedAt: string
}

// ─── API response shapes ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    message: string
    code?: string
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError
