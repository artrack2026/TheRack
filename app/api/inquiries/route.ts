import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, message, product_id, product_title, company } = body

    // Honeypot — a real visitor never sees or fills this field. Accept
    // silently rather than erroring, so scripted spam gets no signal.
    if (typeof company === 'string' && company.trim() !== '') {
      return NextResponse.json({ success: true })
    }

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const { allowed } = await checkRateLimit('inquiry', getClientIp(req), { limit: 4, windowMs: 10 * 60 * 1000 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again in a few minutes.' }, { status: 429 })
    }

    if (!isSupabaseConfigured) {
      console.log('Inquiry received (Supabase not configured):', { name, email, message })
      return NextResponse.json({ success: true })
    }

    const supabase = getSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('inquiries').insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      message: message.trim(),
      product_id: product_id || null,
      product_title: product_title || null,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Inquiry error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
