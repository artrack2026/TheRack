import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, message, product_id, product_title } = body

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
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
