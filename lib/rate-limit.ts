import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase'

/** Best-effort client IP for rate-limiting public routes. Not spoof-proof —
 *  x-forwarded-for is client-influenceable — but combined with a fixed-window
 *  counter it raises the bar for casual scripted abuse without adding a new
 *  external service. */
export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

interface RateLimitOptions {
  /** Max requests allowed within the window. */
  limit: number
  windowMs: number
}

/** Fixed-window rate limit backed by rate_limit_windows + increment_rate_limit(),
 *  a single atomic upsert (see lib/supabase.ts migration) — safe under
 *  concurrent serverless invocations, no read-then-write race.
 *
 *  Fails OPEN on infrastructure errors: a broken rate limiter should never be
 *  the reason a genuine customer's inquiry/order silently fails. */
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  { limit, windowMs }: RateLimitOptions
): Promise<{ allowed: boolean }> {
  try {
    const admin = createSupabaseAdminClient()
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString()

    const { data, error } = await admin.rpc('increment_rate_limit', {
      p_bucket:       bucket,
      p_identifier:   identifier,
      p_window_start: windowStart,
    })

    if (error) {
      console.error(`Rate limit check failed for ${bucket}:`, error)
      return { allowed: true }
    }

    return { allowed: (data ?? 0) <= limit }
  } catch (err) {
    console.error(`Rate limit check threw for ${bucket}:`, err)
    return { allowed: true }
  }
}
