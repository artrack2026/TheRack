-- Run this once in the Supabase SQL editor against your existing project.
--
-- Backs the post-checkout payment-confirmation flow for "redirect"-type
-- methods (Venmo, Cash App, PayPal.me — anything the customer pays via an
-- external link with no callback to this site). See:
--   app/orders/[id]/confirm-payment/page.tsx
--   app/api/orders/[id]/payment-confirmation/route.ts
--   app/api/orders/[id]/payment-confirmation/remind/route.ts
--
-- payment_type and payment_redirect_url snapshot the selected payment
-- method's type/link at checkout time, same reasoning as the existing
-- payment_method/payment_detail/payment_instructions columns — admin
-- settings can change later, so the order keeps its own copy of what the
-- customer actually saw.
--
-- payment_confirmation_code is customer-submitted, never verified against
-- anything (there's no API to check it against for these payment rails —
-- see the migration file's own comment history for why). It's a durable
-- record for the admin reviewing the order, not proof of payment.
alter table orders add column if not exists payment_type text;
alter table orders add column if not exists payment_redirect_url text;
alter table orders add column if not exists payment_confirmation_code text;
alter table orders add column if not exists payment_confirmation_submitted_at timestamptz;
alter table orders add column if not exists payment_reminder_sent_at timestamptz;
