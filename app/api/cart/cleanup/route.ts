import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'

/* POST /api/cart/cleanup
   Body: { cartId? }
   - If cartId provided: clean up that specific cart
   - Otherwise: clean ALL expired carts (for global sweep)
   - Restores stock_count for all items in expired carts
   - Deletes the cart rows (cascade deletes cart_items)
*/
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true })

  const body        = await req.json().catch(() => ({}))
  const cookieStore = await cookies()
  const supabase    = createSupabaseServerClient(cookieStore)

  /* Get carts to clean: either the specific one, or all expired */
  let expiredCarts: { id: string }[] = []

  if (body.cartId) {
    expiredCarts = [{ id: body.cartId }]
  } else {
    const { data } = await supabase
      .from('carts')
      .select('id')
      .lt('expires_at', new Date().toISOString())
    expiredCarts = data ?? []
  }

  let restoredCount = 0

  for (const cart of expiredCarts) {
    /* Get all items in this cart */
    const { data: items } = await supabase
      .from('cart_items')
      .select('product_id, quantity')
      .eq('cart_id', cart.id)

    if (items) {
      /* Restore stock for each item */
      for (const item of items) {
        const { data: product } = await supabase
          .from('products').select('stock_count').eq('id', item.product_id).single()
        if (product) {
          await supabase.from('products')
            .update({ stock_count: product.stock_count + item.quantity })
            .eq('id', item.product_id)
          restoredCount++
        }
      }
    }

    /* Delete the cart (cascade removes cart_items) */
    await supabase.from('carts').delete().eq('id', cart.id)
  }

  return NextResponse.json({ ok: true, cartsCleared: expiredCarts.length, itemsRestored: restoredCount })
}
