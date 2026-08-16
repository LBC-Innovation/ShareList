/**
 * Provider registry — central map of all registered StreamingProvider instances.
 *
 * Provider modules call registerProvider() at import time (side-effect import).
 * Routes call getProvider(name) to retrieve a provider by its stable identifier.
 */

import type { StreamingProvider } from './types'

const providers = new Map<string, StreamingProvider>()

/**
 * Registers a streaming provider.
 * Called once per provider module, typically at module initialisation time.
 * Re-registering the same provider name replaces the previous instance.
 */
export function registerProvider(provider: StreamingProvider): void {
  providers.set(provider.name, provider)
}

/**
 * Returns the provider with the given name.
 * Throws a descriptive error if no provider with that name has been registered,
 * so route handlers surface a clean 400/404 rather than a cryptic undefined read.
 */
export function getProvider(name: string): StreamingProvider {
  const provider = providers.get(name)
  if (!provider) {
    throw new Error(
      `Unknown streaming provider "${name}". ` +
      `Registered providers: ${[...providers.keys()].join(', ') || '(none)'}`,
    )
  }
  return provider
}

/**
 * Returns an array of all registered providers.
 * Useful for the /streaming/providers endpoint that lists available services.
 */
export function listProviders(): StreamingProvider[] {
  return [...providers.values()]
}
