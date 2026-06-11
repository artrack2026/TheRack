import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { requireAdmin } from '@/lib/api-auth'
import { PaymentMethod } from '@/lib/types'

interface ShowroomSettings {
  products_per_row: number
  rows_per_page: number
  inquiry_email: string
  instagram?: string | null
  facebook?: string | null
  x?: string | null
  tiktok?: string | null
  snapchat?: string | null
  youtube?: string | null
  linkedin?: string | null
  threads?: string | null
  bluesky?: string | null
  mastodon?: string | null
  tax_rate: number
  shipping_fee: number
  free_shipping_threshold: number
  payment_methods: PaymentMethod[]
}

const DEFAULT_SETTINGS: ShowroomSettings = {
  products_per_row: 4,
  rows_per_page: 2,
  inquiry_email: process.env.NEXT_PUBLIC_INQUIRY_EMAIL || '',
  instagram: null, facebook: null, x: null, tiktok: null, snapchat: null,
  youtube: null, linkedin: null, threads: null, bluesky: null, mastodon: null,
  tax_rate: 0,
  shipping_fee: 0,
  free_shipping_threshold: 0,
  payment_methods: [],
}

function mapRow(data: Record<string, unknown>): ShowroomSettings {
  return {
    products_per_row:       (data.products_per_row as number) || 4,
    rows_per_page:          (data.rows_per_page as number) || 2,
    inquiry_email:          (data.inquiry_email as string) || '',
    instagram:              (data.instagram as string | null) ?? null,
    facebook:               (data.facebook as string | null) ?? null,
    x:                      (data.x as string | null) ?? null,
    tiktok:                 (data.tiktok as string | null) ?? null,
    snapchat:               (data.snapchat as string | null) ?? null,
    youtube:                (data.youtube as string | null) ?? null,
    linkedin:               (data.linkedin as string | null) ?? null,
    threads:                (data.threads as string | null) ?? null,
    bluesky:                (data.bluesky as string | null) ?? null,
    mastodon:               (data.mastodon as string | null) ?? null,
    tax_rate:               Number(data.tax_rate)               || 0,
    shipping_fee:           Number(data.shipping_fee)           || 0,
    free_shipping_threshold:Number(data.free_shipping_threshold)|| 0,
    payment_methods:        Array.isArray(data.payment_methods) ? (data.payment_methods as PaymentMethod[]) : [],
  }
}

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({
      success: false,
      settings: null,
      message: 'Supabase not configured',
    }, { status: 500 })
  }

  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    const { data, error } = await supabase
      .from('showroom_settings')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!data) {
      return NextResponse.json({ success: true, settings: DEFAULT_SETTINGS })
    }

    return NextResponse.json({ success: true, settings: mapRow(data as Record<string, unknown>) })
  } catch (error) {
    return NextResponse.json({
      success: false,
      settings: null,
      message: error instanceof Error ? error.message : 'Failed to fetch settings',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({
      success: false,
      message: 'Supabase not configured',
    }, { status: 500 })
  }

  try {
    const check = await requireAdmin()
    if ('error' in check) {
      return NextResponse.json({ success: false, message: check.error }, { status: check.status })
    }

    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    const body = await request.json()
    const {
      products_per_row, rows_per_page, inquiry_email,
      instagram, facebook, x, tiktok, snapchat, youtube, linkedin, threads, bluesky, mastodon,
      tax_rate, shipping_fee, free_shipping_threshold, payment_methods,
    } = body

    if (typeof products_per_row !== 'number' || products_per_row < 1 || products_per_row > 12) {
      return NextResponse.json({ success: false, message: 'products_per_row must be between 1 and 12' }, { status: 400 })
    }
    if (typeof rows_per_page !== 'number' || rows_per_page < 1 || rows_per_page > 10) {
      return NextResponse.json({ success: false, message: 'rows_per_page must be between 1 and 10' }, { status: 400 })
    }
    if (typeof inquiry_email !== 'string' || !inquiry_email.includes('@')) {
      return NextResponse.json({ success: false, message: 'inquiry_email must be a valid email address' }, { status: 400 })
    }

    const { data: existing } = await supabase.from('showroom_settings').select('id').eq('id', 1).single()

    const payload = {
      products_per_row,
      rows_per_page,
      inquiry_email,
      instagram: instagram || null,
      facebook: facebook || null,
      x: x || null,
      tiktok: tiktok || null,
      snapchat: snapchat || null,
      youtube: youtube || null,
      linkedin: linkedin || null,
      threads: threads || null,
      bluesky: bluesky || null,
      mastodon: mastodon || null,
      tax_rate:                Number(tax_rate)                || 0,
      shipping_fee:            Number(shipping_fee)            || 0,
      free_shipping_threshold: Number(free_shipping_threshold) || 0,
      payment_methods:         Array.isArray(payment_methods) ? payment_methods : [],
      updated_at: new Date().toISOString(),
    }

    let data, error
    if (existing) {
      ;({ data, error } = await supabase.from('showroom_settings').update(payload).eq('id', 1).select().single())
    } else {
      ;({ data, error } = await supabase.from('showroom_settings').insert([{ id: 1, ...payload }]).select().single())
    }

    if (error) throw error
    if (!data) throw new Error('No data returned after save')

    return NextResponse.json({ success: true, settings: mapRow(data as Record<string, unknown>) })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update settings',
    }, { status: 500 })
  }
}
