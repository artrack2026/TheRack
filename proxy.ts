import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/* ── Coming Soon firewall ──────────────────────────────────────────
   Set NEXT_PUBLIC_COMING_SOON=true in Vercel env vars to enable.
   Admins who are logged in can still access everything normally.
────────────────────────────────────────────────────────────────── */
const COMING_SOON = process.env.NEXT_PUBLIC_COMING_SOON === 'true'

const PUBLIC_PATHS = [
  '/coming-soon',
  '/login',
  '/api',
  '/_next',
  '/images',
  '/favicon.ico',
]

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // ── Coming Soon firewall ──
  if (COMING_SOON) {
    const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p))
    const isAdmin = user
      ? await supabase.from('profiles').select('role').eq('id', user.id).single()
          .then(({ data }) => data?.role === 'admin')
      : false

    // Block everyone except admins and public paths
    if (!isPublicPath && !isAdmin) {
      return NextResponse.redirect(new URL('/coming-soon', request.url))
    }
  }

  // ── Auth guards ──
  if (!user && (pathname.startsWith('/portal') || pathname.startsWith('/admin'))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
