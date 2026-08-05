-- Run this once in the Supabase SQL editor against your existing project.
-- Adds 'consignor' as a third recognized role alongside 'customer' and
-- 'admin'. This is the role/auth level only — the enrollment, approval,
-- and consignor product-management workflow is separate future work.
--
-- The auto-generated constraint name may differ from profiles_role_check —
-- adjust if this fails (check `\d profiles` in psql, or the table's
-- constraints tab in the Supabase dashboard, to find the actual name).

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('customer','admin','consignor'));
