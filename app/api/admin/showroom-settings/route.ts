import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'

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
      // Return defaults if no settings exist
      return NextResponse.json({
        success: true,
        settings: {
          products_per_row: 4,
          rows_per_page: 2,
          inquiry_email: process.env.NEXT_PUBLIC_INQUIRY_EMAIL || '',
          instagram: null,
          facebook: null,
          x: null,
          tiktok: null,
          snapchat: null,
          youtube: null,
          linkedin: null,
          threads: null,
          bluesky: null,
          mastodon: null,
        } as ShowroomSettings,
      })
    }

    return NextResponse.json({
      success: true,
      settings: {
        products_per_row: data.products_per_row || 4,
        rows_per_page: data.rows_per_page || 2,
        inquiry_email: data.inquiry_email || '',
        instagram: data.instagram,
        facebook: data.facebook,
        x: data.x,
        tiktok: data.tiktok,
        snapchat: data.snapchat,
        youtube: data.youtube,
        linkedin: data.linkedin,
        threads: data.threads,
        bluesky: data.bluesky,
        mastodon: data.mastodon,
      } as ShowroomSettings,
    })
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
    const cookieStore = await cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const { products_per_row, rows_per_page, inquiry_email, instagram, facebook, x, tiktok, snapchat, youtube, linkedin, threads, bluesky, mastodon } = body

    // Validate inputs
    if (typeof products_per_row !== 'number' || products_per_row < 1 || products_per_row > 12) {
      return NextResponse.json({
        success: false,
        message: 'products_per_row must be between 1 and 12',
      }, { status: 400 })
    }

    if (typeof rows_per_page !== 'number' || rows_per_page < 1 || rows_per_page > 10) {
      return NextResponse.json({
        success: false,
        message: 'rows_per_page must be between 1 and 10',
      }, { status: 400 })
    }

    if (typeof inquiry_email !== 'string' || !inquiry_email.includes('@')) {
      return NextResponse.json({
        success: false,
        message: 'inquiry_email must be a valid email address',
      }, { status: 400 })
    }

    // Check if the settings row exists
    const { data: existing } = await supabase
      .from('showroom_settings')
      .select('id')
      .eq('id', 1)
      .single()

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
      updated_at: new Date().toISOString(),
    }

    let data, error
    if (existing) {
      // Row exists — UPDATE (covered by RLS admin update policy)
      ;({ data, error } = await supabase
        .from('showroom_settings')
        .update(payload)
        .eq('id', 1)
        .select()
        .single())
    } else {
      // No row yet — INSERT
      ;({ data, error } = await supabase
        .from('showroom_settings')
        .insert([{ id: 1, ...payload }])
        .select()
        .single())
    }

    if (error) throw error
    if (!data) throw new Error('No data returned after save')

    return NextResponse.json({
      success: true,
      settings: {
        products_per_row: data.products_per_row,
        rows_per_page: data.rows_per_page,
        inquiry_email: data.inquiry_email,
        instagram: data.instagram,
        facebook: data.facebook,
        x: data.x,
        tiktok: data.tiktok,
        snapchat: data.snapchat,
        youtube: data.youtube,
        linkedin: data.linkedin,
        threads: data.threads,
        bluesky: data.bluesky,
        mastodon: data.mastodon,
      } as ShowroomSettings,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update settings',
    }, { status: 500 })
  }
}
