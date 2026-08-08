import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseAdminClient, createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const { allowed } = await checkRateLimit('guest_checkout', getClientIp(req), { limit: 5, windowMs: 30 * 60 * 1000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again in a bit.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const {
      cartId,
      firstName,
      lastName,
      email,
      phone,
      address_line1,
      address_line2,
      city,
      state,
      zip,
      notes,
      paymentMethod,
      sessionId = null,
    } = body

    /* user_id always comes from the authenticated session, never the request body —
       otherwise a caller could attribute an order to an arbitrary account. */
    const cookieStore   = await cookies()
    const sessionClient = createSupabaseServerClient(cookieStore)
    const { data: { user } } = await sessionClient.auth.getUser()
    const userId = user?.id ?? null

    if (!firstName || !lastName || !email || !cartId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()

    // Fetch cart with items and product details
    const { data: cart, error: cartError } = await admin
      .from('carts')
      .select(`
        *,
        items:cart_items(
          id, product_id, quantity, price_at_add,
          product:products(id, title, category)
        )
      `)
      .eq('id', cartId)
      .single()

    if (cartError || !cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (cart as any).items ?? []
    if (items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Fetch checkout settings
    const { data: settings } = await admin
      .from('showroom_settings')
      .select('tax_rate, shipping_fee, free_shipping_threshold, payment_methods')
      .eq('id', 1)
      .single()

    const taxRate            = (settings?.tax_rate            as number) ?? 0
    const shippingFee        = (settings?.shipping_fee        as number) ?? 0
    const freeThreshold      = (settings?.free_shipping_threshold as number) ?? 0

    // Snapshot the selected payment method's name/detail/instructions as they
    // appeared at checkout — admin settings can change later, so the order
    // keeps its own copy for the invoice.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = Array.isArray(settings?.payment_methods) ? (settings.payment_methods as any[]) : []
    const selectedMethod = methods.find(m => m.id === paymentMethod)

    // The client already filters to .enabled methods when listing them
    // (app/checkout/page.tsx), but a stale page (open in a tab since
    // before an admin edit) could still submit an id that's been deleted
    // or disabled since — without this check the order used to go through
    // anyway with every payment_* field silently null, leaving the
    // customer with no way to know how to pay.
    if (!selectedMethod || selectedMethod.enabled === false) {
      return NextResponse.json(
        { error: 'That payment method is no longer available. Please refresh the page and pick another.' },
        { status: 400 },
      )
    }

    const paymentMethodName   = selectedMethod.name ?? null
    const paymentDetail       = selectedMethod.detail ?? null
    // Instructions apply to any method type that has them, not just
    // 'instruction' — 'redirect' methods (Venmo/Cash App/PayPal.me) can
    // carry admin-authored notes too (app/admin/showroom/page.tsx), and
    // those need to survive onto the order the same way.
    const paymentInstructions = selectedMethod.instructions
      ? String(selectedMethod.instructions).replace(/\{detail\}/g, selectedMethod.detail ?? '').replace(/\{name\}/g, selectedMethod.detail ?? '')
      : null
    const paymentType        = selectedMethod.type ?? null
    const paymentRedirectUrl = selectedMethod.type === 'redirect' ? (selectedMethod.redirect_url ?? null) : null

    // Calculate totals
    const subtotal = items.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, item: any) => sum + item.price_at_add * item.quantity,
      0,
    )
    const shipping = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : shippingFee
    const tax      = Math.round(subtotal * taxRate * 100) / 100
    const total    = Math.round((subtotal + shipping + tax) * 100) / 100

    // Create order
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id:        userId,
        session_id:     sessionId,
        status:         'new',
        total,
        shipping_total: shipping,
        tax_total:      tax,
        amount_paid:    0,
        customer_name:  `${firstName} ${lastName}`.trim(),
        customer_email: email.toLowerCase().trim(),
        customer_phone: phone || null,
        address_line1:  address_line1 || null,
        address_line2:  address_line2 || null,
        city:           city || null,
        state:          state || null,
        zip:            zip || null,
        notes:          notes || null,
        payment_method:        paymentMethodName,
        payment_detail:        paymentDetail,
        payment_instructions:  paymentInstructions,
        payment_type:          paymentType,
        payment_redirect_url:  paymentRedirectUrl,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Order insert error:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Create order items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderItems = items.map((item: any) => ({
      order_id:         order.id,
      product_id:       item.product_id,
      product_title:    item.product?.title    ?? 'Unknown Product',
      product_category: item.product?.category ?? 'goods',
      quantity:         item.quantity,
      price:            item.price_at_add,
    }))

    const { error: itemsError } = await admin.from('order_items').insert(orderItems)
    if (itemsError) console.error('Order items insert error:', itemsError)

    // Delete cart (cleanup)
    await admin.from('cart_items').delete().eq('cart_id', cartId)
    await admin.from('carts').delete().eq('id', cartId)

    return NextResponse.json({
      orderId:     order.id,
      total:       order.total,
      paymentType: paymentType,
      subtotal,
      shipping,
      tax,
    })
  } catch (err) {
    console.error('POST /api/orders error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
