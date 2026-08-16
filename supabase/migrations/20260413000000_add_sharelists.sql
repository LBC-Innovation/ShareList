-- sharelists: user-created shared playlists
create table public.sharelists (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sharelists_updated_at
  before update on public.sharelists
  for each row execute function public.set_updated_at();

alter table public.sharelists enable row level security;

create policy "users: select own sharelists"
  on public.sharelists for select using (auth.uid() = owner_id);

comment on table public.sharelists is
  'User-created ShareLists. Each ShareList links to one or more third-party playlists.';

-- sharelist_links: ties a ShareList to a specific third-party playlist
create table public.sharelist_links (
  id                             uuid primary key default gen_random_uuid(),
  sharelist_id                   uuid not null references public.sharelists(id) on delete cascade,
  user_id                        uuid not null references auth.users(id) on delete cascade,
  provider                       text not null,
  provider_playlist_id           text not null,
  provider_playlist_name         text not null,
  provider_playlist_image_url    text,
  provider_playlist_external_url text,
  is_primary                     boolean not null default false,
  created_at                     timestamptz not null default now(),
  constraint sharelist_links_unique unique (sharelist_id, provider, provider_playlist_id)
);

alter table public.sharelist_links enable row level security;

create policy "users: select own sharelist links"
  on public.sharelist_links for select using (auth.uid() = user_id);

comment on table public.sharelist_links is
  'Links a ShareList to a specific third-party playlist. is_primary marks the main playlist for track display.';
