-- Run this once in the Supabase SQL editor against your existing project.
--
-- 1. Adds `status` to profiles for soft-deactivation. "Inactive" blocks
--    login but keeps the profile row and its full history intact — the
--    reversible alternative to deleting an account. Login is actually
--    blocked at the Supabase Auth layer (banning the auth.users row via
--    the admin API's ban_duration), set alongside this column by
--    app/api/admin/users/route.ts; this column is the durable, queryable
--    record of that state for the admin UI.
--
-- 2. Protects the site's one guaranteed admin account
--    (art-r-ack@gmail.com) from ever being deleted, or demoted off the
--    admin role, so there's always at least one account that can sign in
--    and manage the site. Deletion protection also covers deleting the
--    underlying auth.users row (e.g. via supabase.auth.admin.deleteUser),
--    since profiles.id cascades from auth.users on delete and this
--    trigger still runs mid-cascade, aborting the whole delete on
--    failure.
--
-- Any future table holding monetary/transactional records tied to a user
-- (gift cards, store credit, orders, etc.) should reference auth.users(id)
-- with `on delete set null` — never cascade — so a deleted account's
-- purchase/tax history is retained. orders, order_refunds, and
-- store_credits already follow this pattern.

alter table profiles add column if not exists status text not null default 'active' check (status in ('active', 'inactive'));

create or replace function protect_master_admin()
returns trigger language plpgsql as $$
begin
  if lower(old.email) = 'art-r-ack@gmail.com' then
    if tg_op = 'DELETE' then
      raise exception 'This account is protected and cannot be deleted.';
    elsif tg_op = 'UPDATE' and new.role <> 'admin' then
      raise exception 'This account is protected and must remain an admin.';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists protect_master_admin_delete on profiles;
create trigger protect_master_admin_delete
  before delete on profiles
  for each row execute function protect_master_admin();

drop trigger if exists protect_master_admin_role on profiles;
create trigger protect_master_admin_role
  before update on profiles
  for each row execute function protect_master_admin();
