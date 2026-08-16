import { supabaseAdmin } from './supabase'

export interface SharelistRow {
  id: string
  owner_id: string
  name: string
  created_at: string
  updated_at: string
}

export async function getAccessibleSharelist(
  userId: string,
  sharelistId: string,
): Promise<SharelistRow | null> {
  const { data: list, error } = await supabaseAdmin
    .from('sharelists')
    .select('*')
    .eq('id', sharelistId)
    .single()

  if (error || !list) return null

  const row = list as SharelistRow
  if (row.owner_id === userId) return row

  const { data: collab, error: collabErr } = await supabaseAdmin
    .from('sharelist_collaborators')
    .select('id')
    .eq('sharelist_id', sharelistId)
    .eq('user_id', userId)
    .maybeSingle()

  if (collabErr) throw new Error(collabErr.message)
  if (!collab) return null
  return row
}

export async function listAccessibleSharelists(userId: string): Promise<{
  lists: SharelistRow[]
  sharedIds: Set<string>
}> {
  const { data: owned, error: ownedErr } = await supabaseAdmin
    .from('sharelists')
    .select('*')
    .eq('owner_id', userId)

  if (ownedErr) throw new Error(ownedErr.message)

  const { data: collabs, error: collabErr } = await supabaseAdmin
    .from('sharelist_collaborators')
    .select('sharelist_id')
    .eq('user_id', userId)

  if (collabErr) throw new Error(collabErr.message)

  const sharedIds = new Set((collabs ?? []).map(c => c.sharelist_id as string))
  const ownedRows = (owned ?? []) as SharelistRow[]
  const ownedIdSet = new Set(ownedRows.map(l => l.id))
  const missingSharedIds = [...sharedIds].filter(id => !ownedIdSet.has(id))

  let sharedRows: SharelistRow[] = []
  if (missingSharedIds.length > 0) {
    const { data: shared, error: sharedErr } = await supabaseAdmin
      .from('sharelists')
      .select('*')
      .in('id', missingSharedIds)

    if (sharedErr) throw new Error(sharedErr.message)
    sharedRows = (shared ?? []) as SharelistRow[]
  }

  const lists = [...ownedRows, ...sharedRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return { lists, sharedIds }
}
