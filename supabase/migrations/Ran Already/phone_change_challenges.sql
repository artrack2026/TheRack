-- Run this once in the Supabase SQL editor against your existing project.
-- Confirms a NEW phone number is reachable before it's written to profiles,
-- so a typo or wrong number never locks someone out of SMS-based 2FA login.
-- requested_by is null when a customer verifies their own number, and set
-- to the admin's id when an admin changes it on a customer's behalf.
-- Service-role only — no public/authenticated policies, so RLS denies all client access.

create table if not exists phone_change_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  new_phone text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table phone_change_challenges enable row level security;
