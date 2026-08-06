-- Run this once in the Supabase SQL editor against your existing project.
-- Which app-icon variant (Admin -> Showroom Settings -> Branding) is
-- currently active, read at request time by generateMetadata() in
-- app/layout.tsx so switching the selection takes effect immediately with
-- no redeploy. Values are '1' or '2', matching the two files in
-- public/icons/ (apple-icon-1.png/apple-icon-2.png, tab-icon-1.png/tab-icon-2.png).

alter table showroom_settings add column if not exists apple_icon_choice text not null default '1';
alter table showroom_settings add column if not exists tab_icon_choice text not null default '1';
