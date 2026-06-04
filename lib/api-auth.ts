import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'

/** Verifies the request comes from a logged-in admin.
 *  Returns { user } on success, or { error, status } on failure. */
export async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase    = createSupabaseServerClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Forbidden', status: 403 as const }

  return { user, supabase }
}
