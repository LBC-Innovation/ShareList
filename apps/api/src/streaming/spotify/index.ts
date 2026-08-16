/**
 * Spotify provider self-registration.
 *
 * Import this module once (e.g. in apps/api/src/index.ts) to register the
 * Spotify provider with the global registry.  All routes then access it via
 * `getProvider('spotify')` — no direct imports of SpotifyProvider needed.
 */

import { registerProvider } from '../registry'
import { SpotifyProvider } from './SpotifyProvider'

registerProvider(new SpotifyProvider())

export { SpotifyProvider }
