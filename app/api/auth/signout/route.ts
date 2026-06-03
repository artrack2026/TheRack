import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'

/*
  Server-side sign out — far more reliable than client-side.
  Supabase clears all auth cookies in the response headers,
  so there's no race condition between localStorage and cookies.
  Usage: window.location.href = '/api/auth/signout'
*/
export async function GET(request: NextRequest) {
  const redirectTo = new URL('/', request.url)

  if (isSupabaseConfigured) {
    try {
      const cookieStore = await cookies()
      const supabase = createSupabaseServerClient(cookieStore)
      await supabase.auth.signOut()
    } catch {
      // best-effort — redirect regardless
    }
  }

  const response = NextResponse.redirect(redirectTo)
  
  // Add cache-busting headers to ensure browser doesn't cache the redirect
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')

  return response
}
