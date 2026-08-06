import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { requireAdmin } from '@/lib/api-auth'

/* POST /api/admin/users/reset-password
   Body: { id, method: 'link' } — emails the user a Supabase password-reset
     link; nothing changes until they click it and set their own password.
   Body: { id, method: 'temporary', password } — sets the password directly
     and flags the profile so the next login is forced to
     /auth/change-password before /portal or /admin become reachable.
*/
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const { id, method, password } = await req.json()
  if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  if (method === 'link') {
    const { data: profile } = await admin.from('profiles').select('email').eq('id', id).single()
    if (!profile?.email) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { error } = await admin.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${req.nextUrl.origin}/auth/change-password`,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  }

  if (method === 'temporary') {
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const { error: authError } = await admin.auth.admin.updateUserById(id, { password })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

    const { error: profileError } = await admin.from('profiles').update({ must_change_password: true }).eq('id', id)
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'method must be "link" or "temporary"' }, { status: 400 })
}
