import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { listVendorCredentialStatus, setVendorCredential, clearVendorCredential } from '@/lib/vendor-credentials'

/* GET /api/admin/vendor-credentials — status only, never the secret itself */
export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const status = await listVendorCredentialStatus()
  return NextResponse.json({ status })
}

/* POST /api/admin/vendor-credentials — Body: { vendor, credentialKey, value }
   Encrypts and stores; returns only the last 4 characters, never the value. */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const { vendor, credentialKey, value } = await req.json()
  if (
    typeof vendor !== 'string' || !vendor ||
    typeof credentialKey !== 'string' || !credentialKey ||
    typeof value !== 'string' || !value.trim()
  ) {
    return NextResponse.json({ error: 'vendor, credentialKey, and a non-empty value are required' }, { status: 400 })
  }

  try {
    const lastFour = await setVendorCredential(vendor, credentialKey, value.trim(), check.user.id)
    return NextResponse.json({ ok: true, lastFour })
  } catch (err) {
    console.error('Failed to store vendor credential:', err)
    const message = err instanceof Error && err.message.includes('VENDOR_CREDENTIALS_ENCRYPTION_KEY')
      ? err.message
      : 'Failed to store credential.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/* DELETE /api/admin/vendor-credentials — Body: { vendor, credentialKey } */
export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const { vendor, credentialKey } = await req.json()
  if (typeof vendor !== 'string' || !vendor || typeof credentialKey !== 'string' || !credentialKey) {
    return NextResponse.json({ error: 'vendor and credentialKey are required' }, { status: 400 })
  }

  await clearVendorCredential(vendor, credentialKey)
  return NextResponse.json({ ok: true })
}
