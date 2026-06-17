import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'

/* POST /api/cart/items
   Body: { productId, sessionId, existingCartId? }
   - Creates cart if needed
   - Checks stock_count > 0
   - Decrements stock by quantity
   - Inserts cart_item row using the product's real, server-side price
   - Returns { cartId, cartItemId, expiresAt }
*/
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const { productId, sessionId, existingCartId } = await req.json()
  if (!productId || !sessionId) return NextResponse.json({ error: 'productId and sessionId are required' }, { status: 400 })

  const cookieStore = await cookies()
  const supabase    = createSupabaseServerClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  /* 1. Check stock — price always comes from this row, never the client */
  const { data: product, error: pErr } = await supabase
    .from('products').select('price, stock_count').eq('id', productId).single()
  if (pErr || !product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  if (product.stock_count < 1) return NextResponse.json({ error: 'Out of stock' }, { status: 409 })

  /* 2. Get or create cart */
  let cartId = existingCartId as string | null
  let expiresAt: string

  if (cartId) {
    const { data: cart } = await supabase.from('carts').select('expires_at').eq('id', cartId).single()
    expiresAt = cart?.expires_at ?? new Date(Date.now() + 48 * 3600_000).toISOString()
  } else {
    const exp = new Date(Date.now() + 48 * 3600_000).toISOString()
    const { data: newCart, error: cErr } = await supabase
      .from('carts')
      .insert([{ session_id: sessionId, user_id: user?.id ?? null, expires_at: exp }])
      .select('id, expires_at')
      .single()
    if (cErr || !newCart) return NextResponse.json({ error: 'Could not create cart' }, { status: 500 })
    cartId    = newCart.id
    expiresAt = newCart.expires_at
  }

  /* 3. Insert cart_item */
  const { data: cartItem, error: ciErr } = await supabase
    .from('cart_items')
    .insert([{ cart_id: cartId, product_id: productId, quantity: 1, price_at_add: product.price }])
    .select('id')
    .single()
  if (ciErr || !cartItem) return NextResponse.json({ error: 'Could not add item to cart' }, { status: 500 })

  /* 4. Decrement stock */
  await supabase.from('products').update({ stock_count: product.stock_count - 1 }).eq('id', productId)

  return NextResponse.json({ cartId, cartItemId: cartItem.id, expiresAt })
}
