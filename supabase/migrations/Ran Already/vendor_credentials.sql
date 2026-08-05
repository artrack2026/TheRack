-- Run this once in the Supabase SQL editor against your existing project.
-- Stores payment-processor API keys (Stripe, Square, ...) entered via the
-- admin "CC Vendors" tab. Values are AES-256-GCM encrypted with
-- VENDOR_CREDENTIALS_ENCRYPTION_KEY (lib/vendor-credentials.ts) before being
-- written here — the admin panel only ever sees last_four, never the
-- plaintext or ciphertext again after saving.
-- Service-role only — no public/authenticated policies, so RLS denies all
-- client access; only server code with the encryption key can make use of
-- what's stored here even if it were somehow read directly.
--
-- Also requires VENDOR_CREDENTIALS_ENCRYPTION_KEY to be set in your
-- environment (Vercel + .env.local) — a base64-encoded 32-byte key. Generate
-- one with:
--   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

create table if not exists vendor_credentials (
  vendor text not null,
  credential_key text not null,
  encrypted_value text not null,
  last_four text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (vendor, credential_key)
);

alter table vendor_credentials enable row level security;
