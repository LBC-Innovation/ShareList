/**
 * Apple Music provider self-registration.
 *
 * Import this module once (e.g. in apps/api/src/index.ts) to register the
 * Apple Music provider with the global registry.  All routes then access it
 * via `getProvider('apple_music')` — no direct imports needed.
 */

import { registerProvider } from '../registry'
import { AppleMusicProvider } from './AppleMusicProvider'

registerProvider(new AppleMusicProvider())

export { AppleMusicProvider }
