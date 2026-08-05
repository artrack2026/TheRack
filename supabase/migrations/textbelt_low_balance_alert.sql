-- Run this once in the Supabase SQL editor against your existing project.
-- Tracks when admins were last emailed about a low Textbelt SMS balance
-- (lib/textbelt-alert.ts) so the alert is cooldown-gated to roughly once
-- per 24 hours instead of firing on every SMS sent while under threshold.

alter table showroom_settings add column if not exists textbelt_low_balance_alert_at timestamptz;
