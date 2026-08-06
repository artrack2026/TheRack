/* The site's one guaranteed admin account — protected in the database
   (supabase/migrations/profile_lifecycle_safeguards.sql) from deletion and
   from being demoted off the admin role, so there's always at least one
   account that can sign in and manage the site. Mirrored here so the admin
   UI can disable those actions before ever hitting the server. */
export const PROTECTED_ADMIN_EMAIL = 'art-r-ack@gmail.com'
