import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { requireAdmin } from '@/lib/api-auth'
import { PROTECTED_ADMIN_EMAIL } from '@/lib/constants'

/* Supabase's admin API takes a ban duration, not a boolean — there's no
   literal "forever," so a 100-year span stands in for a permanent ban.
   'none' lifts it. */
const PERMANENT_BAN_DURATION = '876000h'

/* GET /api/admin/users — list all profiles */
export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  // Service-role client: requireAdmin() above already gates this route, and
  // profiles' own RLS admin-select policy self-references profiles (recursive),
  // so a cookie-bound client here would error rather than return all rows.
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, first_name, last_name, display_name, phone, address_line1, address_line2, city, state, zip, role, status, created_at')
    .order('created_at', { ascending: false })

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
  const first_name   = (body.first_name as string)?.trim() || null
  const last_name    = (body.last_name as string)?.trim() || null
  const display_name = (body.display_name as string) ?? null
  const phone        = (body.phone as string)?.trim()
  const role         = (body.role as 'customer' | 'admin' | 'consignor') ?? 'customer'

  if (!email || !password) return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  // Required so every new account can receive its SMS login verification code
  if (!phone) return NextResponse.json({ error: 'A phone number is required for new accounts' }, { status: 400 })

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
    .upsert([{ id: authData.user.id, email, first_name, last_name, display_name, phone, role }])

  if (profileError) {
    /* Clean up the auth user if profile failed */
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, userId: authData.user.id })
}

/* PATCH /api/admin/users — update a user's profile
   Body: { id, ...any profile fields }
*/
export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const { id, ...fields } = await req.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('profiles').update(fields).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Deactivating/reactivating a profile also has to flip the real login gate —
  // this column alone is just a record, Supabase Auth is what actually blocks
  // sign-in. Done after the profile write so the protected-admin role trigger
  // (see profile_lifecycle_safeguards.sql) still guards against sneaking a
  // status change through if the update above were ever broadened to it.
  if (fields.status === 'active' || fields.status === 'inactive') {
    const { error: banError } = await admin.auth.admin.updateUserById(id, {
      ban_duration: fields.status === 'inactive' ? PERMANENT_BAN_DURATION : 'none',
    })
    if (banError) return NextResponse.json({ error: banError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/* DELETE /api/admin/users — permanently remove an account
   Body: { id }
   Deletes the Supabase Auth user, which cascades to its profile row.
   Transactional records (orders, refunds, store credit) are kept —
   they reference the user with `on delete set null`, not cascade.
*/
export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  const { data: profile } = await admin.from('profiles').select('email').eq('id', id).single()
  if (profile?.email?.toLowerCase() === PROTECTED_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'This account is protected and cannot be deleted.' }, { status: 403 })
  }

  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
