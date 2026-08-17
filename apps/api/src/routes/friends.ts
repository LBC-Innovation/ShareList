/**
 * Friends / ShareList invite routes.
 *
 *   GET    /friends                         — people, sent pending, incoming requests
 *   POST   /friends/share                   — share a list (collaborator or email invite)
 *   POST   /friends/unshare                 — unshare a list
 *   POST   /friends/remove                  — remove friend / pending invites
 *   POST   /friends/invites                 — send an invite email
 *   POST   /friends/invites/:id/resend      — resend a pending invite
 *   DELETE /friends/invites/:id             — delete a pending invite
 *   GET    /friends/invites/:token          — public invite preview
 *   POST   /friends/invites/:token/accept   — accept invite by email token (auth required)
 *   POST   /friends/requests/:id/accept     — accept an incoming invite from the app
 *   POST   /friends/requests/:id/reject     — reject an incoming invite from the app
 */

import { randomBytes } from 'crypto'
import { Router, type Request, type Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { supabaseAdmin, supabaseAuth } from '../lib/supabase'
import { getAccessibleSharelist } from '../lib/sharelistAccess'
import { sendShareInviteEmail } from '../lib/email'
import { clientOrigin } from '../lib/origins'

const router = Router()

function log(level: string, message: string, ctx: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level, message, ...ctx }))
}

interface InviteRow {
  id: string
  sharelist_id: string
  inviter_id: string
  invitee_email: string
  token: string
  status: string
  expires_at: string
  created_at: string
}

interface CollaboratorRow {
  sharelist_id: string
  user_id: string
  invited_by: string
}

async function getUserEmail(userId: string): Promise<string> {
  const { data, error } = await supabaseAuth.auth.admin.getUserById(userId)
  if (error || !data.user?.email) return ''
  return data.user.email
}

async function getOwnedSharelist(userId: string, sharelistId: string) {
  const list = await getAccessibleSharelist(userId, sharelistId)
  if (!list || list.owner_id !== userId) return null
  return list
}

async function createAndSendInvite(opts: {
  inviterId: string
  inviterEmail: string
  inviteeEmail: string
  sharelistId: string
  sharelistName: string
}): Promise<{ sent: true } | { error: string; status: number }> {
  const { inviterId, inviterEmail, inviteeEmail, sharelistId, sharelistName } = opts

  const { data: existingPending, error: pendingErr } = await supabaseAdmin
    .from('sharelist_invites')
    .select('id')
    .eq('sharelist_id', sharelistId)
    .eq('invitee_email', inviteeEmail)
    .eq('status', 'pending')
    .maybeSingle()

  if (pendingErr) throw new Error(pendingErr.message)
  if (existingPending) {
    return { error: 'An invite is already pending for this email', status: 409 }
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { error: insertErr } = await supabaseAdmin.from('sharelist_invites').insert({
    sharelist_id: sharelistId,
    inviter_id: inviterId,
    invitee_email: inviteeEmail,
    token,
    status: 'pending',
    expires_at: expiresAt,
  })

  if (insertErr) throw new Error(insertErr.message)

  await sendShareInviteEmail({
    to: inviteeEmail,
    inviterEmail,
    sharelistName,
    acceptUrl: `${clientOrigin()}/invite/${token}`,
  })

  return { sent: true }
}

async function acceptInviteForUser(
  row: InviteRow,
  userId: string,
  userEmail: string,
): Promise<{ accepted: true; sharelistId: string } | { error: string; status: number }> {
  if (row.status !== 'pending' || new Date(row.expires_at).getTime() < Date.now()) {
    return { error: 'This invite is no longer valid', status: 410 }
  }

  if (row.invitee_email.toLowerCase() !== userEmail) {
    return {
      error: `This invite was sent to ${row.invitee_email}. Sign in with that email to accept.`,
      status: 403,
    }
  }

  if (row.inviter_id === userId) {
    return { error: 'You cannot accept your own invite', status: 400 }
  }

  const { error: collabErr } = await supabaseAdmin.from('sharelist_collaborators').upsert(
    {
      sharelist_id: row.sharelist_id,
      user_id: userId,
      invited_by: row.inviter_id,
    },
    { onConflict: 'sharelist_id,user_id' },
  )

  if (collabErr) throw new Error(collabErr.message)

  const { error: updateErr } = await supabaseAdmin
    .from('sharelist_invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', row.id)

  if (updateErr) throw new Error(updateErr.message)

  return { accepted: true, sharelistId: row.sharelist_id }
}

async function loadIncomingPendingInvite(userEmail: string, inviteId: string): Promise<InviteRow | null> {
  const { data: invite, error } = await supabaseAdmin
    .from('sharelist_invites')
    .select('*')
    .eq('id', inviteId)
    .eq('invitee_email', userEmail)
    .single()

  if (error || !invite) return null
  return invite as InviteRow
}


// ── GET /friends ──────────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  try {
    const { data: owned, error: ownedErr } = await supabaseAdmin
      .from('sharelists')
      .select('id, name, owner_id')
      .eq('owner_id', userId)

    if (ownedErr) throw new Error(ownedErr.message)

    const ownedLists = owned ?? []
    const ownedIds = ownedLists.map(l => l.id as string)

    const { data: collabsOnOwned, error: onOwnedErr } = ownedIds.length > 0
      ? await supabaseAdmin
          .from('sharelist_collaborators')
          .select('sharelist_id, user_id, invited_by')
          .in('sharelist_id', ownedIds)
      : { data: [], error: null }

    if (onOwnedErr) throw new Error(onOwnedErr.message)

    const { data: myCollabs, error: myCollabsErr } = await supabaseAdmin
      .from('sharelist_collaborators')
      .select('sharelist_id, user_id, invited_by')
      .eq('user_id', userId)

    if (myCollabsErr) throw new Error(myCollabsErr.message)

    const receivedListIds = (myCollabs ?? []).map(c => c.sharelist_id as string)
    const { data: receivedLists, error: receivedErr } = receivedListIds.length > 0
      ? await supabaseAdmin.from('sharelists').select('id, name, owner_id').in('id', receivedListIds)
      : { data: [], error: null }

    if (receivedErr) throw new Error(receivedErr.message)

    const listNameById = new Map<string, { name: string; ownerId: string }>()
    for (const list of [...ownedLists, ...(receivedLists ?? [])]) {
      listNameById.set(list.id as string, { name: list.name as string, ownerId: list.owner_id as string })
    }

    const friendIds = new Set<string>()
    const listsByFriend = new Map<string, { id: string; name: string }[]>()

    const addList = (friendId: string, listId: string) => {
      if (friendId === userId) return
      friendIds.add(friendId)
      const meta = listNameById.get(listId)
      if (!meta) return
      const arr = listsByFriend.get(friendId) ?? []
      if (!arr.some(l => l.id === listId)) arr.push({ id: listId, name: meta.name })
      listsByFriend.set(friendId, arr)
    }

    for (const row of (collabsOnOwned ?? []) as CollaboratorRow[]) {
      addList(row.user_id, row.sharelist_id)
    }
    for (const row of (myCollabs ?? []) as CollaboratorRow[]) {
      const meta = listNameById.get(row.sharelist_id)
      if (meta) addList(meta.ownerId, row.sharelist_id)
    }

    const friends = await Promise.all(
      [...friendIds].map(async id => ({
        userId: id,
        email: await getUserEmail(id),
        lists: listsByFriend.get(id) ?? [],
      })),
    )

    friends.sort((a, b) => a.email.localeCompare(b.email))

    const { data: pendingRows, error: pendingErr } = await supabaseAdmin
      .from('sharelist_invites')
      .select('id, sharelist_id, invitee_email, expires_at, created_at')
      .eq('inviter_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (pendingErr) throw new Error(pendingErr.message)

    const pendingListIds = [...new Set((pendingRows ?? []).map(r => r.sharelist_id as string))]
    const pendingListNames = new Map<string, string>()
    if (pendingListIds.length > 0) {
      const { data: pendingLists, error: pendingListsErr } = await supabaseAdmin
        .from('sharelists')
        .select('id, name')
        .in('id', pendingListIds)
      if (pendingListsErr) throw new Error(pendingListsErr.message)
      for (const list of pendingLists ?? []) {
        pendingListNames.set(list.id as string, list.name as string)
      }
    }

    const pending = (pendingRows ?? []).map(row => ({
      id: row.id as string,
      email: row.invitee_email as string,
      sharelistId: row.sharelist_id as string,
      sharelistName: pendingListNames.get(row.sharelist_id as string) ?? 'ShareList',
    }))

    const ownedIdSet = new Set(ownedIds)
    const peopleByEmail = new Map<string, {
      userId: string | null
      email: string
      status: 'pending' | 'active'
      sharedListIds: string[]
    }>()

    for (const friend of friends) {
      const email = friend.email.toLowerCase()
      const sharedListIds = friend.lists
        .map(l => l.id)
        .filter(id => ownedIdSet.has(id))
      peopleByEmail.set(email, {
        userId: friend.userId,
        email: friend.email,
        status: 'active',
        sharedListIds,
      })
    }

    for (const invite of pending) {
      const email = invite.email.toLowerCase()
      const existing = peopleByEmail.get(email)
      if (existing) {
        if (!existing.sharedListIds.includes(invite.sharelistId)) {
          existing.sharedListIds.push(invite.sharelistId)
        }
        continue
      }
      peopleByEmail.set(email, {
        userId: null,
        email: invite.email,
        status: 'pending',
        sharedListIds: [invite.sharelistId],
      })
    }

    const people = [...peopleByEmail.values()].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
      return a.email.localeCompare(b.email)
    })

    const userEmail = req.user!.email.trim().toLowerCase()
    const { data: incomingRows, error: incomingErr } = await supabaseAdmin
      .from('sharelist_invites')
      .select('id, sharelist_id, inviter_id, created_at, expires_at')
      .eq('invitee_email', userEmail)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (incomingErr) throw new Error(incomingErr.message)

    const incomingListIds = [...new Set((incomingRows ?? []).map(r => r.sharelist_id as string))]
    const incomingListNames = new Map<string, string>()
    if (incomingListIds.length > 0) {
      const { data: incomingLists, error: incomingListsErr } = await supabaseAdmin
        .from('sharelists')
        .select('id, name')
        .in('id', incomingListIds)
      if (incomingListsErr) throw new Error(incomingListsErr.message)
      for (const list of incomingLists ?? []) {
        incomingListNames.set(list.id as string, list.name as string)
      }
    }

    const incomingInviterIds = [...new Set((incomingRows ?? []).map(r => r.inviter_id as string))]
    const incomingInviterEmails = new Map<string, string>()
    await Promise.all(incomingInviterIds.map(async id => {
      incomingInviterEmails.set(id, await getUserEmail(id))
    }))

    const incoming = (incomingRows ?? []).map(row => ({
      id: row.id as string,
      inviterEmail: incomingInviterEmails.get(row.inviter_id as string) || 'Unknown user',
      requestedAt: row.created_at as string,
      sharelistName: incomingListNames.get(row.sharelist_id as string) ?? 'ShareList',
    }))

    res.json({ data: { friends, pending, people, incoming }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'GET /friends failed', { userId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

function parseFriendTarget(body: { userId?: string; email?: string }): { userId?: string; email?: string } | null {
  const userId = body.userId?.trim() || undefined
  const email = body.email?.trim().toLowerCase() || undefined
  if (!userId && !email) return null
  return { userId, email }
}

// ── POST /friends/share ───────────────────────────────────────────────────────

router.post('/share', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const inviterEmail = req.user!.email
  const { sharelistId } = req.body as { sharelistId?: string }
  const target = parseFriendTarget(req.body as { userId?: string; email?: string })

  if (!sharelistId || !target) {
    res.status(400).json({ data: null, error: { message: 'sharelistId and userId or email are required' } })
    return
  }

  try {
    const list = await getOwnedSharelist(userId, sharelistId)
    if (!list) {
      res.status(404).json({ data: null, error: { message: 'ShareList not found' } })
      return
    }

    if (target.userId) {
      if (target.userId === userId) {
        res.status(400).json({ data: null, error: { message: 'You cannot share a list with yourself' } })
        return
      }
      const { error: collabErr } = await supabaseAdmin.from('sharelist_collaborators').upsert(
        {
          sharelist_id: sharelistId,
          user_id: target.userId,
          invited_by: userId,
        },
        { onConflict: 'sharelist_id,user_id' },
      )
      if (collabErr) throw new Error(collabErr.message)
      log('info', 'ShareList shared with friend', { sharelistId, userId, friendId: target.userId })
      res.json({ data: { shared: true }, error: null })
      return
    }

    const inviteeEmail = target.email!
    if (inviteeEmail === inviterEmail.trim().toLowerCase()) {
      res.status(400).json({ data: null, error: { message: 'You cannot share a list with yourself' } })
      return
    }

    const sent = await createAndSendInvite({
      inviterId: userId,
      inviterEmail,
      inviteeEmail,
      sharelistId,
      sharelistName: list.name,
    })
    if ('error' in sent) {
      res.status(sent.status).json({ data: null, error: { message: sent.error } })
      return
    }

    log('info', 'ShareList invite sent', { sharelistId, userId, inviteeEmail })
    res.status(201).json({ data: { shared: true, invited: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'POST /friends/share failed', { userId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

// ── POST /friends/unshare ─────────────────────────────────────────────────────

router.post('/unshare', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { sharelistId } = req.body as { sharelistId?: string }
  const target = parseFriendTarget(req.body as { userId?: string; email?: string })

  if (!sharelistId || !target) {
    res.status(400).json({ data: null, error: { message: 'sharelistId and userId or email are required' } })
    return
  }

  try {
    const list = await getOwnedSharelist(userId, sharelistId)
    if (!list) {
      res.status(404).json({ data: null, error: { message: 'ShareList not found' } })
      return
    }

    if (target.userId) {
      const { error: collabErr } = await supabaseAdmin
        .from('sharelist_collaborators')
        .delete()
        .eq('sharelist_id', sharelistId)
        .eq('user_id', target.userId)
      if (collabErr) throw new Error(collabErr.message)
    }

    if (target.email) {
      const { error: inviteErr } = await supabaseAdmin
        .from('sharelist_invites')
        .delete()
        .eq('sharelist_id', sharelistId)
        .eq('inviter_id', userId)
        .eq('invitee_email', target.email)
        .eq('status', 'pending')
      if (inviteErr) throw new Error(inviteErr.message)
    }

    log('info', 'ShareList unshared', { sharelistId, userId, friendId: target.userId, email: target.email })
    res.json({ data: { unshared: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'POST /friends/unshare failed', { userId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

// ── POST /friends/remove ──────────────────────────────────────────────────────

router.post('/remove', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const target = parseFriendTarget(req.body as { userId?: string; email?: string })

  if (!target) {
    res.status(400).json({ data: null, error: { message: 'userId or email is required' } })
    return
  }

  try {
    const email = target.email
      ?? (target.userId ? (await getUserEmail(target.userId)).toLowerCase() : '')

    const { data: owned, error: ownedErr } = await supabaseAdmin
      .from('sharelists')
      .select('id')
      .eq('owner_id', userId)
    if (ownedErr) throw new Error(ownedErr.message)
    const ownedIds = (owned ?? []).map(l => l.id as string)

    if (target.userId && ownedIds.length > 0) {
      const { error: collabErr } = await supabaseAdmin
        .from('sharelist_collaborators')
        .delete()
        .eq('user_id', target.userId)
        .in('sharelist_id', ownedIds)
      if (collabErr) throw new Error(collabErr.message)

      const { data: theirLists, error: theirErr } = await supabaseAdmin
        .from('sharelists')
        .select('id')
        .eq('owner_id', target.userId)
      if (theirErr) throw new Error(theirErr.message)
      const theirIds = (theirLists ?? []).map(l => l.id as string)
      if (theirIds.length > 0) {
        const { error: leaveErr } = await supabaseAdmin
          .from('sharelist_collaborators')
          .delete()
          .eq('user_id', userId)
          .in('sharelist_id', theirIds)
        if (leaveErr) throw new Error(leaveErr.message)
      }
    }

    if (email) {
      const { error: inviteErr } = await supabaseAdmin
        .from('sharelist_invites')
        .delete()
        .eq('inviter_id', userId)
        .eq('invitee_email', email)
        .eq('status', 'pending')
      if (inviteErr) throw new Error(inviteErr.message)
    }

    log('info', 'Friend removed', { userId, friendId: target.userId, email })
    res.json({ data: { removed: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'POST /friends/remove failed', { userId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

// ── POST /friends/invites ─────────────────────────────────────────────────────

router.post('/invites', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const inviterEmail = req.user!.email
  const { email, sharelistId } = req.body as { email?: string; sharelistId?: string }

  if (!email || !sharelistId) {
    res.status(400).json({ data: null, error: { message: 'email and sharelistId are required' } })
    return
  }

  const inviteeEmail = email.trim().toLowerCase()
  if (!inviteeEmail.includes('@')) {
    res.status(400).json({ data: null, error: { message: 'A valid email is required' } })
    return
  }

  if (inviteeEmail === inviterEmail.trim().toLowerCase()) {
    res.status(400).json({ data: null, error: { message: 'You cannot invite yourself' } })
    return
  }

  try {
    const list = await getOwnedSharelist(userId, sharelistId)
    if (!list) {
      res.status(404).json({ data: null, error: { message: 'ShareList not found' } })
      return
    }

    const sent = await createAndSendInvite({
      inviterId: userId,
      inviterEmail,
      inviteeEmail,
      sharelistId,
      sharelistName: list.name,
    })
    if ('error' in sent) {
      res.status(sent.status).json({ data: null, error: { message: sent.error } })
      return
    }

    log('info', 'ShareList invite sent', { sharelistId, userId, inviteeEmail })
    res.status(201).json({ data: { sent: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'POST /friends/invites failed', { userId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

async function loadOwnedPendingInvite(userId: string, inviteId: string): Promise<InviteRow | null> {
  const { data: invite, error } = await supabaseAdmin
    .from('sharelist_invites')
    .select('*')
    .eq('id', inviteId)
    .eq('inviter_id', userId)
    .single()

  if (error || !invite) return null
  return invite as InviteRow
}

// ── POST /friends/invites/:inviteId/resend ────────────────────────────────────

router.post('/invites/:inviteId/resend', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const inviterEmail = req.user!.email
  const { inviteId } = req.params as { inviteId: string }

  try {
    const invite = await loadOwnedPendingInvite(userId, inviteId)
    if (!invite || invite.status !== 'pending') {
      res.status(404).json({ data: null, error: { message: 'Pending invite not found' } })
      return
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { error: updateErr } = await supabaseAdmin
      .from('sharelist_invites')
      .update({ token, expires_at: expiresAt })
      .eq('id', invite.id)

    if (updateErr) throw new Error(updateErr.message)

    const { data: list, error: listErr } = await supabaseAdmin
      .from('sharelists')
      .select('name')
      .eq('id', invite.sharelist_id)
      .single()

    if (listErr || !list) {
      res.status(404).json({ data: null, error: { message: 'ShareList not found' } })
      return
    }

    await sendShareInviteEmail({
      to: invite.invitee_email,
      inviterEmail,
      sharelistName: (list as { name: string }).name,
      acceptUrl: `${clientOrigin()}/invite/${token}`,
    })

    log('info', 'ShareList invite resent', { inviteId, userId, inviteeEmail: invite.invitee_email })
    res.json({ data: { sent: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'POST /friends/invites/:inviteId/resend failed', { userId, inviteId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

// ── DELETE /friends/invites/:inviteId ─────────────────────────────────────────

router.delete('/invites/:inviteId', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { inviteId } = req.params as { inviteId: string }

  try {
    const invite = await loadOwnedPendingInvite(userId, inviteId)
    if (!invite || invite.status !== 'pending') {
      res.status(404).json({ data: null, error: { message: 'Pending invite not found' } })
      return
    }

    const { error: deleteErr } = await supabaseAdmin
      .from('sharelist_invites')
      .delete()
      .eq('id', invite.id)
      .eq('inviter_id', userId)

    if (deleteErr) throw new Error(deleteErr.message)

    log('info', 'ShareList invite deleted', { inviteId, userId, inviteeEmail: invite.invitee_email })
    res.json({ data: { deleted: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'DELETE /friends/invites/:inviteId failed', { userId, inviteId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

// ── GET /friends/invites/:token ───────────────────────────────────────────────

router.get('/invites/:token', async (req: Request, res: Response) => {
  const { token } = req.params as { token: string }
  try {
    const { data: invite, error } = await supabaseAdmin
      .from('sharelist_invites')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !invite) {
      res.status(404).json({ data: null, error: { message: 'Invite not found' } })
      return
    }

    const row = invite as InviteRow
    if (row.status !== 'pending' || new Date(row.expires_at).getTime() < Date.now()) {
      res.status(410).json({ data: null, error: { message: 'This invite is no longer valid' } })
      return
    }

    const { data: list, error: listErr } = await supabaseAdmin
      .from('sharelists')
      .select('name')
      .eq('id', row.sharelist_id)
      .single()

    if (listErr || !list) {
      res.status(404).json({ data: null, error: { message: 'ShareList not found' } })
      return
    }

    const inviterEmail = await getUserEmail(row.inviter_id)

    res.json({
      data: {
        inviteeEmail: row.invitee_email,
        inviterEmail,
        sharelistName: (list as { name: string }).name,
      },
      error: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'GET /friends/invites/:token failed', { error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

// ── POST /friends/invites/:token/accept ───────────────────────────────────────

router.post('/invites/:token/accept', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const userEmail = req.user!.email.trim().toLowerCase()
  const { token } = req.params as { token: string }

  try {
    const { data: invite, error } = await supabaseAdmin
      .from('sharelist_invites')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !invite) {
      res.status(404).json({ data: null, error: { message: 'Invite not found' } })
      return
    }

    const result = await acceptInviteForUser(invite as InviteRow, userId, userEmail)
    if ('error' in result) {
      res.status(result.status).json({ data: null, error: { message: result.error } })
      return
    }

    log('info', 'ShareList invite accepted', { sharelistId: result.sharelistId, userId })
    res.json({ data: { accepted: true, sharelistId: result.sharelistId }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'POST /friends/invites/:token/accept failed', { userId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

// ── POST /friends/requests/:inviteId/accept ───────────────────────────────────

router.post('/requests/:inviteId/accept', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const userEmail = req.user!.email.trim().toLowerCase()
  const { inviteId } = req.params as { inviteId: string }

  try {
    const invite = await loadIncomingPendingInvite(userEmail, inviteId)
    if (!invite) {
      res.status(404).json({ data: null, error: { message: 'Pending request not found' } })
      return
    }

    const result = await acceptInviteForUser(invite, userId, userEmail)
    if ('error' in result) {
      res.status(result.status).json({ data: null, error: { message: result.error } })
      return
    }

    log('info', 'ShareList request accepted', { sharelistId: result.sharelistId, userId, inviteId })
    res.json({ data: { accepted: true, sharelistId: result.sharelistId }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'POST /friends/requests/:inviteId/accept failed', { userId, inviteId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

// ── POST /friends/requests/:inviteId/reject ───────────────────────────────────

router.post('/requests/:inviteId/reject', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const userEmail = req.user!.email.trim().toLowerCase()
  const { inviteId } = req.params as { inviteId: string }

  try {
    const invite = await loadIncomingPendingInvite(userEmail, inviteId)
    if (!invite || invite.status !== 'pending' || new Date(invite.expires_at).getTime() < Date.now()) {
      res.status(404).json({ data: null, error: { message: 'Pending request not found' } })
      return
    }

    const { error: updateErr } = await supabaseAdmin
      .from('sharelist_invites')
      .update({ status: 'rejected' })
      .eq('id', invite.id)
      .eq('invitee_email', userEmail)

    if (updateErr) throw new Error(updateErr.message)

    log('info', 'ShareList request rejected', { sharelistId: invite.sharelist_id, userId, inviteId })
    res.json({ data: { rejected: true }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'POST /friends/requests/:inviteId/reject failed', { userId, inviteId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

export default router
