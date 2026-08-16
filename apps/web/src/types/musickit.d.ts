/**
 * Minimal type declarations for Apple's MusicKit JS (loaded dynamically from CDN).
 * https://js-cdn.music.apple.com/musickit/v3/musickit.js
 *
 * This is a script-context ambient file (no imports/exports) so declarations
 * are globally available without a `declare global {}` wrapper.
 */

interface MusicKitInstance {
  authorize(): Promise<string>
}

interface MusicKitGlobal {
  configure(config: {
    developerToken: string
    app: { name: string; build: string }
  }): MusicKitInstance
  getInstance(): MusicKitInstance
}

interface Window {
  MusicKit?: MusicKitGlobal
}
