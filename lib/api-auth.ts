import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { SESSION_STARTED_COOKIE, LAST_ACTIVE_COOKIE, SESSION_INACTIVITY_MAX_AGE } from '@/lib/session-timeout'

/** Verifies the request comes from a logged-in admin.
 *  Returns { user } on success, or { error, status } on failure. */
export async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase    = createSupabaseServerClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  // Defense-in-depth for the app-level session timeout (components/
  // AuthProvider.tsx) — a client-side-only check can be bypassed by
  // hitting an admin route directly with a still-valid Supabase JWT.
  // These marker cookies expire long before Supabase's own (up to
  // 400-day) refresh token would.
  if (!cookieStore.get(SESSION_STARTED_COOKIE) || !cookieStore.get(LAST_ACTIVE_COOKIE)) {
    return { error: 'Session expired', status: 401 as const }
  }
  cookieStore.set(LAST_ACTIVE_COOKIE, '1', { path: '/', maxAge: SESSION_INACTIVITY_MAX_AGE, sameSite: 'lax' })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Forbidden', status: 403 as const }

  return { user, supabase }
}
