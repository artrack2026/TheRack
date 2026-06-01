import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient, createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'

/* Guard: ensure caller is an authenticated admin */
async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase    = createSupabaseServerClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Forbidden', status: 403 }

  return { user }
}

/* GET /api/admin/users — list all profiles */
export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const cookieStore = await cookies()
  const supabase    = createSupabaseServerClient(cookieStore)
  const { data, error } = await supabase
    .from('profiles').select('id, email, display_name, role, created_at').order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/* POST /api/admin/users — create a new Supabase Auth user + profile
   Body: { email, password, display_name?, role? }
   Email is normalized to lowercase.
*/
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const body = await req.json()
  const email        = (body.email as string)?.toLowerCase().trim()
  const password     = body.password as string
  const display_name = (body.display_name as string) ?? null
  const role         = (body.role as 'customer' | 'admin') ?? 'customer'

  if (!email || !password) return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  /* Create the Supabase Auth user */
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,  // skip email confirmation — admin creates verified accounts
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Failed to create auth user' }, { status: 400 })
  }

  /* Upsert the profile row (trigger may have created it already) */
  const { error: profileError } = await admin
    .from('profiles')
    .upsert([{ id: authData.user.id, email, display_name, role }])

  if (profileError) {
    /* Clean up the auth user if profile failed */
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, userId: authData.user.id })
}

/* PATCH /api/admin/users — update a user's role
   Body: { id, role }
*/
export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const { id, role } = await req.json()
  if (!id || !role) return NextResponse.json({ error: 'id and role are required' }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('profiles').update({ role }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
