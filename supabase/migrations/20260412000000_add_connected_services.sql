-- connected_services: stores per-user OAuth tokens for streaming providers.
-- Tokens are stored as plaintext (MVP) — protected by RLS and service role only.
-- All writes go through the API using the service role; clients can only read their own rows.

create table public.connected_services (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  provider          text not null,           -- 'spotify' | 'apple_music'
  access_token      text not null,
  refresh_token     text,                    -- null for providers without refresh tokens
  token_expires_at  timestamptz,             -- null if token does not expire
  provider_user_id  text,                    -- user's ID on the provider platform
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint connected_services_user_provider_unique unique (user_id, provider)
);

-- Auto-update updated_at on any row change.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger connected_services_updated_at
  before update on public.connected_services
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.connected_services enable row level security;

-- Users may read their own connections (e.g. to show "Connected" status in UI).
create policy "users: select own connections"
  on public.connected_services
  for select
  using (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE from the client — service role bypasses RLS
-- for all write operations via the API.

comment on table public.connected_services is
  'Stores OAuth tokens for third-party streaming services linked to a ShareList user. '
  'Writes are service-role only. Token encryption at rest is a future hardening story.';
