/** App-level replacement for Supabase's "Time-box user sessions" /
 *  inactivity-timeout controls — those require a Supabase Pro plan. These
 *  are plain (non-httpOnly, non-secret) marker cookies: their mere
 *  presence/expiry is the signal, not their contents. Supabase's own
 *  session (and its 400-day-capped refresh token) stays untouched; these
 *  just give the app an independent, shorter clock to sign someone out by.
 *
 *  Enforced in two places:
 *  - components/AuthProvider.tsx (client) — checks on mount, on window
 *    focus, and on an interval, since an idle-but-focused tab never fires
 *    a focus event to trigger a re-check.
 *  - lib/api-auth.ts's requireAdmin() (server) — defense-in-depth for
 *    admin API routes, since a client-side-only check can be bypassed by
 *    hitting a route directly with a still-valid Supabase JWT. */

export const SESSION_STARTED_COOKIE = 'session_started_at'
export const LAST_ACTIVE_COOKIE = 'last_active_at'

/** Absolute cap on a login, regardless of activity. */
export const SESSION_ABSOLUTE_MAX_AGE = 60 * 60 * 24 // 24 hours

/** How long a session may sit idle before it's treated as expired. */
export const SESSION_INACTIVITY_MAX_AGE = 60 * 60 * 2 // 2 hours
