/**
 * Friends / ShareList invite routes.
 *
 *   GET    /friends                         — friends grouped with shared lists
 *   POST   /friends/invites                 — send an invite email
 *   POST   /friends/invites/:id/resend      — resend a pending invite
 *   DELETE /friends/invites/:id             — delete a pending invite
 *   GET    /friends/invites/:token          — public invite preview
 *   POST   /friends/invites/:token/accept   — accept invite (auth required)
 */

import { randomBytes } from 'crypto'
import { Router, type Request, type Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { supabaseAdmin, supabaseAuth } from '../lib/supabase'
import { getAccessibleSharelist } from '../lib/sharelistAccess'
import { sendShareInviteEmail } from '../lib/email'

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

function clientOrigin(): string {
  return process.env['CLIENT_ORIGIN'] ?? 'http://localhost:5173'
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

    res.json({ data: { friends, pending }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'GET /friends failed', { userId, error: message })
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
    const list = await getAccessibleSharelist(userId, sharelistId)
    if (!list) {
      res.status(404).json({ data: null, error: { message: 'ShareList not found' } })
      return
    }

    const { data: existingPending, error: pendingErr } = await supabaseAdmin
      .from('sharelist_invites')
      .select('id')
      .eq('sharelist_id', sharelistId)
      .eq('invitee_email', inviteeEmail)
      .eq('status', 'pending')
      .maybeSingle()

    if (pendingErr) throw new Error(pendingErr.message)
    if (existingPending) {
      res.status(409).json({ data: null, error: { message: 'An invite is already pending for this email' } })
      return
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { error: insertErr } = await supabaseAdmin.from('sharelist_invites').insert({
      sharelist_id: sharelistId,
      inviter_id: userId,
      invitee_email: inviteeEmail,
      token,
      status: 'pending',
      expires_at: expiresAt,
    })

    if (insertErr) throw new Error(insertErr.message)

    const acceptUrl = `${clientOrigin()}/invite/${token}`
    await sendShareInviteEmail({
      to: inviteeEmail,
      inviterEmail,
      sharelistName: list.name,
      acceptUrl,
    })

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

    const row = invite as InviteRow
    if (row.status !== 'pending' || new Date(row.expires_at).getTime() < Date.now()) {
      res.status(410).json({ data: null, error: { message: 'This invite is no longer valid' } })
      return
    }

    if (row.invitee_email !== userEmail) {
      res.status(403).json({
        data: null,
        error: { message: `This invite was sent to ${row.invitee_email}. Sign in with that email to accept.` },
      })
      return
    }

    if (row.inviter_id === userId) {
      res.status(400).json({ data: null, error: { message: 'You cannot accept your own invite' } })
      return
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

    log('info', 'ShareList invite accepted', { sharelistId: row.sharelist_id, userId })
    res.json({ data: { accepted: true, sharelistId: row.sharelist_id }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log('error', 'POST /friends/invites/:token/accept failed', { userId, error: message })
    res.status(500).json({ data: null, error: { message } })
  }
})

export default router
