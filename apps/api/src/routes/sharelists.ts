/**
 * ShareList routes — CRUD for user ShareLists.
 *
 * A ShareList is a named list that links to one or more third-party playlists.
 * The first linked playlist is marked is_primary=true and its tracks are
 * returned in the detail endpoint.
 *
 * Routes:
 *   GET    /sharelists           — list user's ShareLists with link metadata
 *   POST   /sharelists           — create new ShareList from a playlist link
 *   GET    /sharelists/:id       — ShareList detail + tracks from primary link
 *   PATCH  /sharelists/:id       — rename a ShareList
 *   POST   /sharelists/:id/links — link an additional playlist to a ShareList
 *   DELETE /sharelists/:id/links/:linkId — unlink a playlist from a ShareList
 *   DELETE /sharelists/:id               — owner deletes (collaborators keep their links);
 *                                          collaborator leaves (owner's list remains)
 */

import { Router, type Request, type Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { supabaseAdmin, supabaseAuth } from '../lib/supabase'
import { getProvider } from '../streaming/registry'
import { isProviderRateLimitError, providerErrorHttp } from '../streaming/errors'
import { runCrossSync, applyLinkedPlaylistOrder } from '../services/crossSync'
import { collapseTracksWithMappings, loadMappingsForTracks, resolveMappingsForTracks } from '../services/trackMatcher'
import { getAccessibleSharelist, listAccessibleSharelists } from '../lib/sharelistAccess'
import type { StreamingTrack } from '../streaming/types'

// Side-effect: ensure providers are registered
import '../streaming/spotify'
import '../streaming/apple-music'
import '../streaming/soundcloud'

const router = Router()

function log(level: string, message: string, ctx: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level, message, ...ctx }))
}

function trackFetchWarning(reason: unknown, playlistName: string): string {
  if (isProviderRateLimitError(reason)) return reason.message
  const errMsg = reason instanceof Error ? reason.message : 'Unknown'
  if (errMsg.includes('403') || errMsg.includes('must own it')) {
    return `${playlistName}: Spotify only returns tracks for playlists the connected account owns or collaborates on`
  }
  return `${playlistName}: ${errMsg}`
}

const SHARELIST_NAME_MAX = 100

function normalizeSharelistName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return trimmed.slice(0, SHARELIST_NAME_MAX)
}

function sendCaughtError(res: Response, err: unknown, logMessage: string, ctx: Record<string, unknown>): void {
  const limited = providerErrorHttp(err)
  if (limited) {
    log('warn', logMessage, { ...ctx, error: limited.message, code: limited.code })
    res.status(limited.status).json({ data: null, error: { message: limited.message, code: limited.code } })
    return
  }
  const message = err instanceof Error ? err.message : 'Unknown error'
  log('error', logMessage, { ...ctx, error: message })
  res.status(500).json({ data: null, error: { message } })
}

async function getOwnerEmail(userId: string): Promise<string> {
  const { data, error } = await supabaseAuth.auth.admin.getUserById(userId)
  if (error || !data.user?.email) return ''
  return data.user.email
}

interface SharelistMember {
  id: string
  displayName: string
  avatarUrl: string | null
}

async function listSharelistMembers(sharelistId: string, ownerId: string): Promise<SharelistMember[]> {
  const { data: collabs, error: collabErr } = await supabaseAdmin
    .from('sharelist_collaborators')
    .select('user_id')
    .eq('sharelist_id', sharelistId)

  if (collabErr) throw new Error(collabErr.message)

  const userIds = [
    ownerId,
    ...new Set(
      (collabs ?? [])
        .map(row => row.user_id as string)
        .filter(id => id !== ownerId),
    ),
  ]

  const { data: profiles, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds)

  if (profileErr) throw new Error(profileErr.message)

  const profileById = new Map(
    (profiles ?? []).map(profile => [profile.id as string, profile as {
      id: string
      display_name: string | null
      avatar_url: string | null
    }]),
  )

  return Promise.all(userIds.map(async id => {
    const profile = profileById.get(id)
    const fromProfile = profile?.display_name?.trim()
    const email = fromProfile ? '' : await getOwnerEmail(id)
    return {
      id,
      displayName: fromProfile || email.split('@')[0] || 'Member',
      avatarUrl: profile?.avatar_url ?? null,
    }
  }))
}

/** Move a user's linked playlists onto a new ShareList they own. Sync log rows stay with the links. */
async function moveLinksToOwnedSharelist(
  ownerId: string,
  name: string,
  links: SharelistLinkRow[],
): Promise<string> {
  if (links.length === 0) throw new Error('Cannot preserve an empty link set')

  const { data: created, error } = await supabaseAdmin
    .from('sharelists')
    .insert({ owner_id: ownerId, name })
    .select('*')
    .single()

  if (error || !created) {
    throw new Error(error?.message ?? 'Failed to preserve collaborator ShareList')
  }

  const newId = (created as SharelistRow).id
  const sorted = [...links].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))

  for (let i = 0; i < sorted.length; i++) {
    const { error: updErr } = await supabaseAdmin
      .from('sharelist_links')
      .update({ sharelist_id: newId, is_primary: i === 0 })
      .eq('id', sorted[i].id)
    if (updErr) throw new Error(updErr.message)
  }

  log('info', 'preserved contributor ShareList', {
    newSharelistId: newId,
    ownerId,
    name,
    linkCount: links.length,
  })
  return newId
}

// ── Row types ─────────────────────────────────────────────────────────────────

interface SharelistRow {
  id: string
  owner_id: string
  name: string
  created_at: string
  updated_at: string
}

interface SharelistLinkRow {
  id: string
  sharelist_id: string
  user_id: string
  provider: string
  provider_playlist_id: string
  provider_playlist_name: string
  provider_playlist_image_url: string | null
  provider_playlist_external_url: string | null
  is_primary: boolean
  created_at: string
}

/** Drop tracks that appear in more than one linked playlist (same provider + id). */
function uniqueSharelistTracks<T extends { id: string; provider?: string }>(tracks: T[]): T[] {
  const seen = new Set<string>()
  const unique: T[] = []
  for (const track of tracks) {
    const key = `${track.provider ?? '_'}::${track.id}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(track)
  }
  return unique
}

async function decorateSharelistTracks(
  tracks: Array<StreamingTrack & { provider?: string }>,
  linkRows: SharelistLinkRow[],
  resolveMissing: boolean,
): Promise<Array<StreamingTrack & { provider?: string }>> {
  const unique = uniqueSharelistTracks(tracks)
  const destLinks = linkRows.map(l => ({ provider: l.provider, userId: l.user_id }))
  const linkedProviders = [...new Set(linkRows.map(l => l.provider))]
  const mappings = resolveMissing
    ? await resolveMappingsForTracks(unique, destLinks)
    : await loadMappingsForTracks(unique, linkedProviders)
  return collapseTracksWithMappings(unique, mappings, linkedProviders)
}

// ── GET /sharelists ───────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  try {
    const { lists, sharedIds } = await listAccessibleSharelists(userId)

    if (lists.length === 0) {
      res.json({ data: [], error: null })
      return
    }

    const ids = lists.map(l => l.id)
    const { data: links, error: linkErr } = await supabaseAdmin
      .from('sharelist_links')
      .select('*')
      .in('sharelist_id', ids)

    if (linkErr) throw new Error(linkErr.message)

    const linksBySharelist = new Map<string, SharelistLinkRow[]>()
    for (const link of (links ?? []) as SharelistLinkRow[]) {
      const arr = linksBySharelist.get(link.sharelist_id) ?? []
      arr.push(link)
      linksBySharelist.set(link.sharelist_id, arr)
    }

    const result = lists.map(list => ({
      id: list.id,
      name: list.name,
      ownerId: list.owner_id,
      createdAt: list.created_at,
      isShared: sharedIds.has(list.id) && list.owner_id !== userId,
      links: (linksBySharelist.get(list.id) ?? []).map(l => ({
        id: l.id,
        provider: l.provider,
        playlistId: l.provider_playlist_id,
        playlistName: l.provider_playlist_name,
        imageUrl: l.provider_playlist_image_url,
        externalUrl: l.provider_playlist_external_url,
        isPrimary: l.is_primary,
      })),
    }))

    res.json({ data: result, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'GET /sharelists failed', { userId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

// ── POST /sharelists ──────────────────────────────────────────────────────────

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { provider, playlistId, playlistName, imageUrl, externalUrl, name } = req.body as {
    provider?: string
    playlistId?: string
    playlistName?: string
    imageUrl?: string
    externalUrl?: string
    name?: string
  }

  if (!provider || !playlistId || !playlistName) {
    res.status(400).json({ data: null, error: { message: 'provider, playlistId, and playlistName are required' } })
    return
  }

  const sharelistName = normalizeSharelistName(name) ?? normalizeSharelistName(playlistName)
  if (!sharelistName) {
    res.status(400).json({ data: null, error: { message: 'A ShareList name is required' } })
    return
  }

  try {
    // Verify the provider is registered and the user has it connected
    getProvider(provider) // throws if unknown

    // Create the ShareList
    const { data: list, error: listErr } = await supabaseAdmin
      .from('sharelists')
      .insert({ owner_id: userId, name: sharelistName })
      .select()
      .single()

    if (listErr) throw new Error(listErr.message)

    const sharelistId = (list as SharelistRow).id

    // Create the primary link
    const { error: linkErr } = await supabaseAdmin
      .from('sharelist_links')
      .insert({
        sharelist_id: sharelistId,
        user_id: userId,
        provider,
        provider_playlist_id: playlistId,
        provider_playlist_name: playlistName,
        provider_playlist_image_url: imageUrl ?? null,
        provider_playlist_external_url: externalUrl ?? null,
        is_primary: true,
      })

    if (linkErr) throw new Error(linkErr.message)

    log('info', 'ShareList created', { sharelistId, userId, provider, playlistId, name: sharelistName })

    res.status(201).json({
      data: {
        id: sharelistId,
        name: sharelistName,
        ownerId: userId,
        createdAt: (list as SharelistRow).created_at,
        isShared: false,
        links: [{
          provider,
          playlistId,
          playlistName,
          imageUrl: imageUrl ?? null,
          externalUrl: externalUrl ?? null,
          isPrimary: true,
        }],
      },
      error: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'POST /sharelists failed', { userId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

// ── GET /sharelists/:id ───────────────────────────────────────────────────────

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { id } = req.params as { id: string }

  try {
    const list = await getAccessibleSharelist(userId, id)
    if (!list) {
      res.status(404).json({ data: null, error: { message: 'ShareList not found' } })
      return
    }

    const { data: links, error: linkErr } = await supabaseAdmin
      .from('sharelist_links')
      .select('*')
      .eq('sharelist_id', id)
      .order('is_primary', { ascending: false })

    if (linkErr) throw new Error(linkErr.message)

    const linkRows = (links ?? []) as SharelistLinkRow[]

    // Fetch tracks from ALL linked playlists in parallel, primary first
    const orderedLinks = [...linkRows].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    const trackResults = await Promise.allSettled(
      orderedLinks.map(async link => {
        log('info', 'fetching tracks from provider', {
          sharelistId: id,
          provider: link.provider,
          providerPlaylistId: link.provider_playlist_id,
          isPrimary: link.is_primary,
        })
        const provider = getProvider(link.provider)
        const linkTracks = await provider.getPlaylistTracks(link.user_id, link.provider_playlist_id)
        return linkTracks.map(t => ({ ...t, provider: link.provider }))
      }),
    )

    const tracks: unknown[] = []
    const warnings: string[] = []
    for (let i = 0; i < trackResults.length; i++) {
      const result = trackResults[i]
      const playlistName = orderedLinks[i].provider_playlist_name
      if (result.status === 'fulfilled') {
        tracks.push(...result.value)
        log('info', 'tracks fetched', { sharelistId: id, provider: orderedLinks[i].provider, trackCount: result.value.length })
      } else {
        const warning = trackFetchWarning(result.reason, playlistName)
        warnings.push(warning)
        log('warn', 'getPlaylistTracks failed', { sharelistId: id, provider: orderedLinks[i].provider, error: warning })
      }
    }

    const uniqueTracks = await decorateSharelistTracks(
      tracks as Array<StreamingTrack & { provider?: string }>,
      linkRows,
      false,
    )
    const members = await listSharelistMembers(id, (list as SharelistRow).owner_id)

    res.json({
      data: {
        id: (list as SharelistRow).id,
        name: (list as SharelistRow).name,
        ownerId: (list as SharelistRow).owner_id,
        ownerEmail: await getOwnerEmail((list as SharelistRow).owner_id),
        createdAt: (list as SharelistRow).created_at,
        isShared: list.owner_id !== userId,
        members,
        links: linkRows.map(l => ({
          id: l.id,
          provider: l.provider,
          playlistId: l.provider_playlist_id,
          playlistName: l.provider_playlist_name,
          imageUrl: l.provider_playlist_image_url,
          externalUrl: l.provider_playlist_external_url,
          isPrimary: l.is_primary,
          userId: l.user_id,
        })),
        tracks: uniqueTracks,
        warnings: [...new Set(warnings)],
      },
      error: null,
    })
  } catch (err) {
    sendCaughtError(res, err, 'GET /sharelists/:id failed', { id, userId })
  }
})

// ── PATCH /sharelists/:id ─────────────────────────────────────────────────────
//
// Renames a ShareList. Does not change linked streaming playlists.

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { id } = req.params as { id: string }
  const name = normalizeSharelistName((req.body as { name?: unknown }).name)

  if (!name) {
    res.status(400).json({ data: null, error: { message: 'name is required' } })
    return
  }

  try {
    const list = await getAccessibleSharelist(userId, id)
    if (!list) {
      res.status(404).json({ data: null, error: { message: 'ShareList not found' } })
      return
    }

    const { data: updated, error } = await supabaseAdmin
      .from('sharelists')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name')
      .single()

    if (error || !updated) throw new Error(error?.message ?? 'Failed to rename ShareList')

    log('info', 'ShareList renamed', { sharelistId: id, userId, name })
    res.json({ data: { id: updated.id as string, name: updated.name as string }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'PATCH /sharelists/:id failed', { id, userId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

// ── POST /sharelists/:id/sync ─────────────────────────────────────────────────
//
// Re-fetches live metadata (name, image) and tracks for every linked playlist,
// writes the refreshed metadata back to sharelist_links, and returns the
// updated ShareList detail exactly like GET /:id.

router.post('/:id/sync', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { id } = req.params as { id: string }

  try {
    const list = await getAccessibleSharelist(userId, id)
    if (!list) {
      res.status(404).json({ data: null, error: { message: 'ShareList not found' } })
      return
    }

    const { data: links, error: linkErr } = await supabaseAdmin
      .from('sharelist_links')
      .select('*')
      .eq('sharelist_id', id)
      .order('is_primary', { ascending: false })

    if (linkErr) throw new Error(linkErr.message)

    const linkRows = (links ?? []) as SharelistLinkRow[]
    let tracks: unknown[] = []
    const warnings: string[] = []

    // Refresh every linked playlist's metadata and collect tracks from primary
    for (const link of linkRows) {
      try {
        const provider = getProvider(link.provider)
        const freshMeta = await provider.getPlaylist(link.user_id, link.provider_playlist_id)

        // Persist refreshed name and image back to DB
        await supabaseAdmin
          .from('sharelist_links')
          .update({
            provider_playlist_name: freshMeta.name,
            provider_playlist_image_url: freshMeta.imageUrl ?? null,
            provider_playlist_external_url: freshMeta.externalUrl ?? link.provider_playlist_external_url,
          })
          .eq('id', link.id)

        // Merge fresh metadata into the in-memory row for the response
        link.provider_playlist_name = freshMeta.name
        link.provider_playlist_image_url = freshMeta.imageUrl ?? null
        if (freshMeta.externalUrl) link.provider_playlist_external_url = freshMeta.externalUrl

        log('info', 'link metadata refreshed', {
          sharelistId: id,
          provider: link.provider,
          freshName: freshMeta.name,
          trackCount: freshMeta.trackCount,
        })

        // Fetch tracks for every link (not just primary); tagged with provider below
        const linkTracks = await provider.getPlaylistTracks(link.user_id, link.provider_playlist_id)
        const tagged = linkTracks.map(t => ({ ...t, provider: link.provider }))
        tracks.push(...tagged)
        log('info', 'tracks synced', { sharelistId: id, provider: link.provider, trackCount: linkTracks.length })
      } catch (syncErr) {
        const warning = trackFetchWarning(syncErr, link.provider_playlist_name)
        warnings.push(warning)
        log('warn', 'sync failed for link', {
          sharelistId: id,
          linkId: link.id,
          provider: link.provider,
          error: warning,
        })
      }
    }

    const uniqueTracks = await decorateSharelistTracks(
      tracks as Array<StreamingTrack & { provider?: string }>,
      linkRows,
      true,
    )
    const members = await listSharelistMembers(id, (list as SharelistRow).owner_id)

    res.json({
      data: {
        id: (list as SharelistRow).id,
        name: (list as SharelistRow).name,
        ownerId: (list as SharelistRow).owner_id,
        ownerEmail: await getOwnerEmail((list as SharelistRow).owner_id),
        createdAt: (list as SharelistRow).created_at,
        isShared: list.owner_id !== userId,
        members,
        links: linkRows.map(l => ({
          id: l.id,
          provider: l.provider,
          playlistId: l.provider_playlist_id,
          playlistName: l.provider_playlist_name,
          imageUrl: l.provider_playlist_image_url,
          externalUrl: l.provider_playlist_external_url,
          isPrimary: l.is_primary,
          userId: l.user_id,
        })),
        tracks: uniqueTracks,
        warnings: [...new Set(warnings)],
      },
      error: null,
    })
  } catch (err) {
    sendCaughtError(res, err, 'POST /sharelists/:id/sync failed', { id, userId })
  }
})

// ── POST /sharelists/:id/links ────────────────────────────────────────────────

router.post('/:id/links', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { id } = req.params as { id: string }
  const { provider, playlistId, playlistName, imageUrl, externalUrl } = req.body as {
    provider?: string
    playlistId?: string
    playlistName?: string
    imageUrl?: string
    externalUrl?: string
  }

  if (!provider || !playlistId || !playlistName) {
    res.status(400).json({ data: null, error: { message: 'provider, playlistId, and playlistName are required' } })
    return
  }

  try {
    // Verify ownership
    const list = await getAccessibleSharelist(userId, id)
    if (!list) {
      res.status(404).json({ data: null, error: { message: 'ShareList not found' } })
      return
    }

    getProvider(provider) // throws if unknown

    const { error: linkErr } = await supabaseAdmin
      .from('sharelist_links')
      .insert({
        sharelist_id: id,
        user_id: userId,
        provider,
        provider_playlist_id: playlistId,
        provider_playlist_name: playlistName,
        provider_playlist_image_url: imageUrl ?? null,
        provider_playlist_external_url: externalUrl ?? null,
        is_primary: false,
      })

    if (linkErr) throw new Error(linkErr.message)

    log('info', 'Playlist linked to ShareList', { sharelistId: id, userId, provider, playlistId })

    try {
      const syncResult = await runCrossSync(userId, id)
      log('info', 'cross-sync after link complete', {
        sharelistId: id,
        userId,
        totalAdded: syncResult.totalAdded,
      })
    } catch (syncErr) {
      log('warn', 'cross-sync after link failed', {
        sharelistId: id,
        userId,
        error: syncErr instanceof Error ? syncErr.message : String(syncErr),
      })
    }

    res.status(201).json({ data: { linked: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'POST /sharelists/:id/links failed', { id, userId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

// ── DELETE /sharelists/:id/links/:linkId ──────────────────────────────────────
//
// Removes a linked playlist from the ShareList. sharelist_sync_log rows for
// that link cascade-delete, so it is unsynced immediately. If the unlinked
// playlist was primary, another remaining link is promoted.

router.delete('/:id/links/:linkId', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { id, linkId } = req.params as { id: string; linkId: string }

  try {
    const list = await getAccessibleSharelist(userId, id)
    if (!list) {
      res.status(404).json({ data: null, error: { message: 'ShareList not found' } })
      return
    }

    const { data: link, error: linkErr } = await supabaseAdmin
      .from('sharelist_links')
      .select('*')
      .eq('id', linkId)
      .eq('sharelist_id', id)
      .single()

    if (linkErr || !link) {
      res.status(404).json({ data: null, error: { message: 'Linked playlist not found' } })
      return
    }

    const wasPrimary = (link as SharelistLinkRow).is_primary

    const { error: deleteErr } = await supabaseAdmin
      .from('sharelist_links')
      .delete()
      .eq('id', linkId)
      .eq('sharelist_id', id)

    if (deleteErr) throw new Error(deleteErr.message)

    if (wasPrimary) {
      const { data: remaining, error: remainingErr } = await supabaseAdmin
        .from('sharelist_links')
        .select('id')
        .eq('sharelist_id', id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (remainingErr) throw new Error(remainingErr.message)

      const nextPrimary = remaining?.[0] as { id: string } | undefined
      if (nextPrimary) {
        const { error: promoteErr } = await supabaseAdmin
          .from('sharelist_links')
          .update({ is_primary: true })
          .eq('id', nextPrimary.id)

        if (promoteErr) throw new Error(promoteErr.message)
      }
    }

    log('info', 'Playlist unlinked from ShareList', {
      sharelistId: id,
      userId,
      linkId,
      provider: (link as SharelistLinkRow).provider,
      playlistId: (link as SharelistLinkRow).provider_playlist_id,
    })
    res.json({ data: { unlinked: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'DELETE /sharelists/:id/links/:linkId failed', { id, linkId, userId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

// ── POST /sharelists/:id/cross-sync ──────────────────────────────────────────
//
// Pushes merged tracks back to every linked playlist so all users end up with
// the full combined track list. Same-provider only in this iteration.
// Returns a per-link breakdown of how many tracks were added.

router.post('/:id/cross-sync', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { id } = req.params as { id: string }

  try {
    // Verify ownership before running the sync
    const list = await getAccessibleSharelist(userId, id)
    if (!list) {
      res.status(404).json({ data: null, error: { message: 'ShareList not found' } })
      return
    }

    log('info', 'cross-sync started', { sharelistId: id, userId })
    const result = await runCrossSync(userId, id)
    log('info', 'cross-sync complete', { sharelistId: id, userId, totalAdded: result.totalAdded })

    res.json({ data: result, error: null })
  } catch (err) {
    sendCaughtError(res, err, 'POST /sharelists/:id/cross-sync failed', { id, userId })
  }
})

// ── POST /sharelists/:id/shuffle ─────────────────────────────────────────────
//
// Applies a client-shuffled track order to every linked playlist. Each playlist
// keeps its own songs; those songs are rewritten in the given relative order.

router.post('/:id/shuffle', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { id } = req.params as { id: string }

  try {
    const list = await getAccessibleSharelist(userId, id)
    if (!list) {
      res.status(404).json({ data: null, error: { message: 'ShareList not found' } })
      return
    }

    const orderedTrackIds = Array.isArray(req.body?.trackIds)
      ? (req.body.trackIds as unknown[]).filter((value): value is string => typeof value === 'string' && value.length > 0)
      : []

    if (orderedTrackIds.length === 0) {
      res.status(400).json({ data: null, error: { message: 'trackIds must be a non-empty array of strings' } })
      return
    }

    log('info', 'shuffle started', { sharelistId: id, userId, trackCount: orderedTrackIds.length })
    const result = await applyLinkedPlaylistOrder(id, orderedTrackIds)
    log('info', 'shuffle complete', { sharelistId: id, userId, totalWritten: result.totalWritten })

    res.json({ data: result, error: null })
  } catch (err) {
    sendCaughtError(res, err, 'POST /sharelists/:id/shuffle failed', { id, userId })
  }
})

// ── DELETE /sharelists/:id ────────────────────────────────────────────────────
//
// Owner: deletes this ShareList. Other users' linked playlists are moved onto
// new ShareLists they own so their contributions are not wiped. Streaming
// playlists are never modified.
//
// Collaborator: leaves. Their linked playlists become their own ShareList;
// the owner's list stays.

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { id } = req.params as { id: string }

  try {
    const list = await getAccessibleSharelist(userId, id)
    if (!list) {
      res.status(404).json({ data: null, error: { message: 'ShareList not found' } })
      return
    }

    const { data: linkRows, error: linksErr } = await supabaseAdmin
      .from('sharelist_links')
      .select('*')
      .eq('sharelist_id', id)

    if (linksErr) throw new Error(linksErr.message)

    const allLinks = (linkRows ?? []) as SharelistLinkRow[]
    const isOwner = list.owner_id === userId

    if (!isOwner) {
      const myLinks = allLinks.filter(l => l.user_id === userId)
      const fallbackName =
        myLinks.find(l => l.is_primary)?.provider_playlist_name
        ?? myLinks[0]?.provider_playlist_name
        ?? list.name

      if (myLinks.length > 0) {
        await moveLinksToOwnedSharelist(userId, fallbackName, myLinks)
      }

      const { error: collabErr } = await supabaseAdmin
        .from('sharelist_collaborators')
        .delete()
        .eq('sharelist_id', id)
        .eq('user_id', userId)
      if (collabErr) throw new Error(collabErr.message)

      const { data: remaining, error: remainingErr } = await supabaseAdmin
        .from('sharelist_links')
        .select('id, is_primary')
        .eq('sharelist_id', id)
        .order('created_at', { ascending: true })
      if (remainingErr) throw new Error(remainingErr.message)

      const stillThere = remaining ?? []
      const hasPrimary = stillThere.some(row => row.is_primary)
      if (!hasPrimary && stillThere[0]) {
        const { error: promoteErr } = await supabaseAdmin
          .from('sharelist_links')
          .update({ is_primary: true })
          .eq('id', stillThere[0].id as string)
        if (promoteErr) throw new Error(promoteErr.message)
      }

      log('info', 'left ShareList', { sharelistId: id, userId, preservedLinks: myLinks.length })
      res.json({ data: { deleted: false, left: true }, error: null })
      return
    }

    const byUser = new Map<string, SharelistLinkRow[]>()
    for (const link of allLinks) {
      const bucket = byUser.get(link.user_id) ?? []
      bucket.push(link)
      byUser.set(link.user_id, bucket)
    }

    let preserved = 0
    for (const [uid, userLinks] of byUser) {
      if (uid === userId) continue
      const fallbackName =
        userLinks.find(l => l.is_primary)?.provider_playlist_name
        ?? userLinks[0]?.provider_playlist_name
        ?? list.name
      await moveLinksToOwnedSharelist(uid, fallbackName, userLinks)
      preserved += 1
    }

    const ownerLinks = byUser.get(userId) ?? []
    const ownerLinkIds = ownerLinks.map(l => l.id)
    if (ownerLinkIds.length > 0) {
      const { error: syncErr } = await supabaseAdmin
        .from('sharelist_sync_log')
        .delete()
        .in('sharelist_link_id', ownerLinkIds)
      if (syncErr) throw new Error(syncErr.message)

      const { error: linkDelErr } = await supabaseAdmin
        .from('sharelist_links')
        .delete()
        .in('id', ownerLinkIds)
      if (linkDelErr) throw new Error(linkDelErr.message)
    }

    const { error: collabErr } = await supabaseAdmin
      .from('sharelist_collaborators')
      .delete()
      .eq('sharelist_id', id)
    if (collabErr) throw new Error(collabErr.message)

    const { error: inviteErr } = await supabaseAdmin
      .from('sharelist_invites')
      .delete()
      .eq('sharelist_id', id)
    if (inviteErr) throw new Error(inviteErr.message)

    const { error: listErr } = await supabaseAdmin
      .from('sharelists')
      .delete()
      .eq('id', id)
    if (listErr) throw new Error(listErr.message)

    log('info', 'ShareList deleted', {
      sharelistId: id,
      userId,
      name: list.name,
      preservedContributorLists: preserved,
    })
    res.json({ data: { deleted: true, left: false }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'DELETE /sharelists/:id failed', { id, userId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

export default router
