-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Extends auth.users with application-level user data.
-- A trigger auto-inserts a row here whenever a new auth.users record is created.

create type user_status as enum ('active', 'suspended');

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text,
  avatar_url      text,
  status          user_status not null default 'active',

  -- Reserved for future streaming service connection flags.
  -- No integration logic yet — columns exist to avoid schema migrations mid-feature.
  spotify_connected       boolean not null default false,
  apple_music_connected   boolean not null default false,
  youtube_music_connected boolean not null default false,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.profiles is
  'Application-level user profile extending auth.users.';
comment on column public.profiles.status is
  'active = normal access; suspended = account blocked by admin.';
comment on column public.profiles.spotify_connected is
  'Reserved: will be true once user completes Spotify OAuth flow.';
comment on column public.profiles.apple_music_connected is
  'Reserved: will be true once user completes Apple Music OAuth flow.';
comment on column public.profiles.youtube_music_connected is
  'Reserved: will be true once user completes YouTube Music OAuth flow.';


-- ─── Auto-update updated_at ───────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();


-- ─── Auto-create profile on sign-up ──────────────────────────────────────────
-- Fires after a new row is inserted into auth.users (by Supabase Auth).
-- display_name defaults to the email prefix if no name is provided.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.profiles enable row level security;

-- Users can read their own profile.
create policy "users: select own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Users can update their own profile (display_name, avatar_url only —
-- status and streaming flags are admin/system-only, enforced at the API layer).
create policy "users: update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role bypasses RLS by default in Postgres; the policies above apply
-- to authenticated (JWT) users only. Admin operations use the service role key
-- server-side and are never exposed to the frontend.


-- ─── RLS pattern note for future tables ──────────────────────────────────────
-- When the `lists` table is created, apply this same pattern:
--
--   alter table public.lists enable row level security;
--
--   create policy "users: select own lists"
--     on public.lists for select using (auth.uid() = owner_id);
--
--   create policy "users: select shared lists"
--     on public.lists for select using (
--       exists (
--         select 1 from public.list_shares
--         where list_shares.list_id = lists.id
--           and list_shares.shared_with = auth.uid()
--       )
--     );
--
--   create policy "users: insert own lists"
--     on public.lists for insert with check (auth.uid() = owner_id);
--
--   create policy "users: update own lists"
--     on public.lists for update using (auth.uid() = owner_id);
--
--   create policy "users: delete own lists"
--     on public.lists for delete using (auth.uid() = owner_id);
