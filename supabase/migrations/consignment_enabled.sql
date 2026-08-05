-- Run this once in the Supabase SQL editor against your existing project.
-- On/off switch for the Consignment feature — gates the "Consignment" nav
-- link and the /consignment and /shop/custome-r-curations pages. Toggled
-- from Admin → Showroom Settings → Consignment.

alter table showroom_settings add column if not exists consignment_enabled boolean not null default false;
