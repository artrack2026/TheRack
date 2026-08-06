-- Run this once in the Supabase SQL editor against your existing project.
--
-- Also requires, in your dashboard:
--   1. Authentication → URL Configuration → Redirect URLs: add
--      <your-site-url>/auth/confirm-email (and the localhost equivalent for
--      dev), or the email-change confirmation link will be rejected.
--   2. A TOTP_ENCRYPTION_KEY env var (Vercel + .env.local) — a base64-encoded
--      32-byte key, same shape as VENDOR_CREDENTIALS_ENCRYPTION_KEY. Generate
--      one with:
--        node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
--      Use a DIFFERENT key than VENDOR_CREDENTIALS_ENCRYPTION_KEY — secrets
--      that protect unrelated things shouldn't share a root key.
--
-- ── Email change ─────────────────────────────────────────────────────
-- Self-service email changes go through supabase.auth.updateUser({ email }),
-- which only finalizes once the confirmation link sent to the NEW address is
-- clicked (see app/portal/profile/page.tsx and app/auth/confirm-email). That
-- updates auth.users.email directly; this trigger mirrors it into
-- profiles.email (our denormalized copy, used for display/lookups) the
-- moment it happens — including if the confirmation is completed on a
-- different device than the one that requested the change, since it runs
-- in the database rather than depending on the client visiting a callback
-- page.
create or replace function sync_profile_email()
returns trigger language plpgsql security definer as $$
begin
  update profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function sync_profile_email();

-- ── Authenticator app (TOTP) 2FA ────────────────────────────────────
-- An alternative, self-contained second factor a user can enroll from their
-- profile — it never depends on Textbelt or Supabase's email sending being
-- up, so it's the most resilient option when either is down. When enrolled,
-- login prefers it over SMS; see app/api/auth/login-step1/route.ts.
--
-- totp_secret_encrypted is AES-256-GCM encrypted with TOTP_ENCRYPTION_KEY
-- (lib/totp.ts) before being written — never stored in plaintext.
-- totp_enabled only flips true after the user proves the enrolled app
-- actually produces valid codes (see PATCH /api/auth/totp), so an
-- interrupted setup never silently becomes an active, unusable 2FA method.
alter table profiles add column if not exists totp_secret_encrypted text;
alter table profiles add column if not exists totp_enabled boolean not null default false;

-- Proves step 1 (password) passed before step 2 (authenticator code) is
-- attempted — same role login_otp_challenges plays for SMS. No code is
-- stored here since a live TOTP code is verified against the profile's
-- secret at the moment it's submitted, not a pre-generated one-time value.
-- Service-role only — no public/authenticated policies, so RLS denies all
-- client access.
create table if not exists login_totp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table login_totp_challenges enable row level security;
