-- admin_unverify_user — clears email_confirmed_at directly on auth.users.
-- Required because updateUserById({ email_confirm: false }) is a no-op in Supabase.
create or replace function public.admin_unverify_user(p_user_id uuid)
returns void
language sql
security definer
as $$
  update auth.users
  set email_confirmed_at = null,
      updated_at = now()
  where id = p_user_id;
$$;

revoke execute on function public.admin_unverify_user(uuid) from public, anon, authenticated;
grant execute on function public.admin_unverify_user(uuid) to service_role;
