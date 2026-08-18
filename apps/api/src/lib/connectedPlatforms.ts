import type { Platform } from '@sharelist/shared'
import { supabaseAdmin } from './supabase'

const KNOWN_PLATFORMS: Platform[] = ['spotify', 'apple_music', 'youtube_music', 'soundcloud']

export function asPlatforms(providers: string[]): Platform[] {
  const set = new Set(providers)
  return KNOWN_PLATFORMS.filter(platform => set.has(platform))
}

export async function connectedPlatformsForUser(userId: string): Promise<Platform[]> {
  const byUser = await connectedPlatformsForUsers([userId])
  return byUser.get(userId) ?? []
}

export async function connectedPlatformsForUsers(
  userIds: string[],
): Promise<Map<string, Platform[]>> {
  const unique = [...new Set(userIds.filter(Boolean))]
  const result = new Map<string, Platform[]>()
  for (const id of unique) result.set(id, [])
  if (unique.length === 0) return result

  const { data, error } = await supabaseAdmin
    .from('connected_services')
    .select('user_id, provider')
    .in('user_id', unique)

  if (error) throw new Error(`connectedPlatformsForUsers failed: ${error.message}`)

  const raw = new Map<string, string[]>()
  for (const row of data ?? []) {
    const userId = row.user_id as string
    const list = raw.get(userId) ?? []
    list.push(row.provider as string)
    raw.set(userId, list)
  }

  for (const id of unique) {
    result.set(id, asPlatforms(raw.get(id) ?? []))
  }
  return result
}
