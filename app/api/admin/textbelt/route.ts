import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function GET() {
  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const key = process.env.TEXTBELT_API_KEY
  const initialQuota = process.env.TEXTBELT_INITIAL_QUOTA

  if (!key) {
    return NextResponse.json({
      success: false,
      remaining: null,
      initialPurchased: initialQuota ? Number(initialQuota) : null,
      apiKey: null,
      message: 'Textbelt API key is not configured. Set TEXTBELT_API_KEY in environment variables.',
    }, { status: 500 })
  }

  try {
    const response = await fetch(`https://textbelt.com/quota/${encodeURIComponent(key)}`)
    const data = await response.json()

    if (!response.ok || data?.success === false) {
      return NextResponse.json({
        success: false,
        remaining: null,
        initialPurchased: initialQuota ? Number(initialQuota) : null,
        apiKey: key,
        message: data?.error || data?.message || 'Unable to fetch Textbelt quota.',
      }, { status: 500 })
    }

    const remaining = typeof data.quotaRemaining === 'number'
      ? data.quotaRemaining
      : typeof data.quota_remaining === 'number'
        ? data.quota_remaining
        : null

    return NextResponse.json({
      success: true,
      remaining,
      initialPurchased: initialQuota ? Number(initialQuota) : null,
      apiKey: key,
      message: null,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      remaining: null,
      initialPurchased: initialQuota ? Number(initialQuota) : null,
      apiKey: key,
      message: error instanceof Error ? error.message : 'Textbelt quota request failed.',
    }, { status: 500 })
  }
}
