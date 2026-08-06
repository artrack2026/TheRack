-- Run this once in the Supabase SQL editor against your existing project.
-- Backs the admin "Void / Refund" flow on an order's invoice.
--
-- order_refunds: audit trail of every refund/void action taken on an order
-- (full or partial, whichever method was chosen). The order's own
-- `amount_paid` is decremented at the time of the action (see
-- app/api/admin/orders/[id]/refund/route.ts) — this table is the durable
-- record of *why* it changed, and is what a partial refund's "Post-Sale
-- Discount" line on the invoice is rendered from.
--
-- store_credits: append-only ledger. A positive `amount` is credit issued
-- (e.g. from choosing "store credit" as the refund method); a customer's
-- current balance is sum(amount) for their rows. Keyed primarily by
-- customer_email since guest orders (user_id null) still need a place to
-- land the credit — user_id is populated when the order has an account
-- attached. There's no redemption flow yet (checkout doesn't spend this
-- down); it's an audit ledger an admin can reference, not wired into
-- checkout in this pass.

create table if not exists order_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('cash', 'store_credit', 'original_payment_method')),
  is_full_refund boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists store_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  amount numeric(10,2) not null,
  reason text not null default 'refund',
  order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists order_refunds_order_id_idx on order_refunds(order_id);
create index if not exists store_credits_customer_email_idx on store_credits(lower(customer_email));
create index if not exists store_credits_user_id_idx on store_credits(user_id);

alter table order_refunds enable row level security;
alter table store_credits enable row level security;

create policy "order_refunds_admin_all" on order_refunds for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "store_credits_admin_all" on store_credits for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Lets a logged-in customer read their own credit history/balance later
-- (e.g. a future portal display) without needing admin access.
create policy "store_credits_own_select" on store_credits for select using (auth.uid() = user_id);
