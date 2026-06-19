-- Run this once in the Supabase SQL editor against your existing project.
-- It migrates the orders table to the new fulfillment-status workflow and
-- adds the columns needed for invoicing (shipping/tax split, amount paid,
-- and a snapshot of the payment method as it appeared at checkout).

-- 1. Add new columns (no-ops if they already exist)
alter table orders add column if not exists shipping_total numeric(10,2) not null default 0;
alter table orders add column if not exists tax_total numeric(10,2) not null default 0;
alter table orders add column if not exists amount_paid numeric(10,2) not null default 0;
alter table orders add column if not exists payment_detail text;
alter table orders add column if not exists payment_instructions text;

-- 2. Drop the old status check constraint FIRST — it only allows the old
--    pending/paid/shipped/delivered/cancelled values, so it must be gone
--    before we can update rows to the new vocabulary below.
--    The auto-generated constraint name may differ — adjust if this fails.
alter table orders drop constraint if exists orders_status_check;

-- 3. Migrate existing status values to the new vocabulary
update orders set status = 'new'       where status = 'pending';
update orders set status = 'in_process' where status = 'paid';

-- Mark amount_paid for anything already past the old 'paid' stage, so the
-- payment column isn't blank for historical orders.
update orders set amount_paid = total where status in ('in_process','ready_to_ship','shipped','delivered') and amount_paid = 0;

-- 4. Add the new constraint now that every row matches the new enum
alter table orders add constraint orders_status_check
  check (status in ('new','in_process','ready_to_ship','shipped','delivered','cancelled','refunded'));

alter table orders alter column status set default 'new';
