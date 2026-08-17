alter table public.sharelist_invites
  drop constraint if exists sharelist_invites_status_check;

alter table public.sharelist_invites
  add constraint sharelist_invites_status_check
  check (status in ('pending', 'accepted', 'expired', 'rejected'));

comment on table public.sharelist_invites is
  'Pending, accepted, expired, or rejected email invitations to collaborate on a ShareList.';
