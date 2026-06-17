import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'

/* POST /api/cart/merge
   Body: { sessionId }
   When a guest logs in, transfer their session cart to their user account.
   userId is taken from the authenticated session, never the request body.
*/
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true })

  const { sessionId } = await req.json()
  if (!sessionId) return NextResponse.json({ ok: true })

  const cookieStore = await cookies()
  const supabase    = createSupabaseServerClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: true })
  const userId = user.id

  /* Find the session cart */
  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('session_id', sessionId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!cart) return NextResponse.json({ ok: true })

  /* Attach it to the user */
  await supabase.from('carts').update({ user_id: userId }).eq('id', cart.id)

  return NextResponse.json({ ok: true, cart: { id: cart.id } })
}
