-- Store the email used to authorize each streaming connection (when the
-- provider exposes one). Apple Music does not provide an account email.

alter table public.connected_services
  add column if not exists provider_email text;

comment on column public.connected_services.provider_email is
  'Email of the linked provider account when the platform exposes one (e.g. Spotify). Null for Apple Music and for connections that have not yet granted user-read-email.';
