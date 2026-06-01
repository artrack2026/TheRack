import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const featured = searchParams.get('featured')
  const limit = parseInt(searchParams.get('limit') || '50')

  const supabase = getSupabaseClient()
  let query = supabase.from('products').select('*').order('created_at', { ascending: false }).limit(limit)

  if (category) query = query.eq('category', category as 'artwork' | 'reclaimed' | 'goods')
  if (featured === 'true') query = query.eq('featured', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
