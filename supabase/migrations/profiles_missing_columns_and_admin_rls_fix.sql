-- Run this once in the Supabase SQL editor against your existing project.
--
-- Two independent fixes for the admin Users page (and any other admin view
-- that reads someone else's profile — invoice modal, order drawer, admin
-- dashboard user count) coming back empty:
--
-- 1. `profiles` is missing first_name/last_name/birthday, which the app
--    code (app/api/admin/users/route.ts, app/admin/orders/page.tsx,
--    lib/invoice.ts) has always read/written as if they existed. Any
--    select/upsert naming them errors with "column does not exist."
--
-- 2. `profiles_admin_select` checks admin status by querying `profiles`
--    from within a policy *on* `profiles` — that re-triggers RLS on the
--    same table and Postgres rejects it with "infinite recursion detected
--    in policy for relation profiles." This broke every admin read of
--    another user's profile row over the anon/authenticated client. It's
--    replaced here with a SECURITY DEFINER helper that checks the role
--    with RLS bypassed, which is the standard fix for this pattern.

alter table profiles add column if not exists first_name text;
alter table profiles add column if not exists last_name text;
alter table profiles add column if not exists birthday date;

create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "profiles_admin_select" on profiles;
create policy "profiles_admin_select" on profiles for select using (is_admin());
