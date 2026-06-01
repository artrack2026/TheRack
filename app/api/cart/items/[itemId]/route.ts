import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'

/* DELETE /api/cart/items/[itemId]
   Body: { cartId }
   - Restores stock_count for the product
   - Deletes the cart_item row
*/
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const { itemId } = await params
  const { cartId }  = await req.json()

  const cookieStore = await cookies()
  const supabase    = createSupabaseServerClient(cookieStore)

  /* Get the cart_item to know which product to restore */
  const { data: item } = await supabase
    .from('cart_items').select('product_id, quantity').eq('id', itemId).eq('cart_id', cartId).single()

  if (item) {
    /* Restore stock */
    const { data: product } = await supabase
      .from('products').select('stock_count').eq('id', item.product_id).single()
    if (product) {
      await supabase.from('products')
        .update({ stock_count: product.stock_count + item.quantity })
        .eq('id', item.product_id)
    }

    /* Delete the item */
    await supabase.from('cart_items').delete().eq('id', itemId)
  }

  return NextResponse.json({ ok: true })
}
