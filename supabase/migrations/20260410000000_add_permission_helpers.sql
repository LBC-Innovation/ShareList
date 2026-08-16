-- has_permission(user_id, permission) — usable in RLS policies and server-side checks.
-- Reads app_metadata.permissions from auth.users so permissions stay in the JWT.
create or replace function public.has_permission(p_user_id uuid, p_permission text)
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (raw_app_meta_data -> 'permissions') ? p_permission,
    false
  )
  from auth.users
  where id = p_user_id;
$$;

-- Revoke public execute — only service role and postgres should call this directly.
revoke execute on function public.has_permission(uuid, text) from public, anon, authenticated;
grant execute on function public.has_permission(uuid, text) to service_role;

comment on function public.has_permission(uuid, text) is
  'Returns true if the user has the given permission string in app_metadata.permissions. '
  'Permissions are managed via the admin API (PUT /admin/users/:id/permissions) and stored '
  'in auth.users.raw_app_meta_data as a JSON string array. '
  'Valid values: usermanage:add, usermanage:suspend, usermanage:updatepassword, usermanage:listusers';
