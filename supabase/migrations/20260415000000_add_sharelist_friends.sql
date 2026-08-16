-- Collaborators have equal manage access to a ShareList (owner remains owner_id).
create table public.sharelist_collaborators (
  id           uuid primary key default gen_random_uuid(),
  sharelist_id uuid not null references public.sharelists(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  invited_by   uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint sharelist_collaborators_unique unique (sharelist_id, user_id)
);

create index idx_sharelist_collaborators_user
  on public.sharelist_collaborators (user_id);

alter table public.sharelist_collaborators enable row level security;

create policy "users: select own collaborations"
  on public.sharelist_collaborators for select
  using (auth.uid() = user_id or auth.uid() = invited_by);

comment on table public.sharelist_collaborators is
  'Users invited onto a ShareList. Collaborators have the same manage permissions as the owner.';

-- Email invites (pending until accepted).
create table public.sharelist_invites (
  id             uuid primary key default gen_random_uuid(),
  sharelist_id   uuid not null references public.sharelists(id) on delete cascade,
  inviter_id     uuid not null references auth.users(id) on delete cascade,
  invitee_email  text not null,
  token          text not null unique,
  status         text not null default 'pending'
                   check (status in ('pending', 'accepted', 'expired')),
  expires_at     timestamptz not null,
  accepted_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index idx_sharelist_invites_token
  on public.sharelist_invites (token);

create index idx_sharelist_invites_email
  on public.sharelist_invites (invitee_email);

alter table public.sharelist_invites enable row level security;

create policy "users: select invites they sent"
  on public.sharelist_invites for select
  using (auth.uid() = inviter_id);

comment on table public.sharelist_invites is
  'Pending/accepted email invitations to collaborate on a ShareList.';
