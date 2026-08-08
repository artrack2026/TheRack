'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import {
  SESSION_STARTED_COOKIE,
  LAST_ACTIVE_COOKIE,
  SESSION_ABSOLUTE_MAX_AGE,
  SESSION_INACTIVITY_MAX_AGE,
} from '@/lib/session-timeout'

function setMarkerCookie(name: string, maxAgeSeconds: number) {
  document.cookie = `${name}=1; path=/; max-age=${maxAgeSeconds}; samesite=lax`
}

function hasMarkerCookie(name: string) {
  return document.cookie.split('; ').some(c => c.startsWith(`${name}=`))
}

function clearMarkerCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`
}

interface AuthContextValue {
  user:    User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  isConsignor: boolean
  signIn:  (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, loading: true, isAdmin: false, isConsignor: false,
  signIn: async () => null,
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshSession: async () => {},
})

export function useAuth() { return useContext(AuthContext) }

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (uid: string) => {
    if (!isSupabaseConfigured) return
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single()
      if (error) throw error
      setProfile(data ?? null)
    } catch (err) {
      // Non-fatal — user is still logged in with profile null, but log it:
      // a null profile silently blocks admin/portal role checks downstream,
      // so a swallowed error here used to be invisible until it manifested
      // as a stuck loading screen with no clue why.
      console.error('Failed to load profile:', err)
      setProfile(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  /* Force session refresh — called on page focus or when auth might be stale */
  const refreshSession = useCallback(async () => {
    if (!isSupabaseConfigured) return
    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user ?? null)
    if (session?.user) {
      await fetchProfile(session.user.id)
    } else {
      setProfile(null)
    }
  }, [fetchProfile])

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    const supabase = getSupabaseClient()

    // Safety net — never spin forever
    const timeout = setTimeout(() => setLoading(false), 4000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) await fetchProfile(session.user.id)
      else setProfile(null)
      clearTimeout(timeout)
      setLoading(false)
    }).catch(() => {
      // If getSession fails, still mark as not loading
      setUser(null)
      setProfile(null)
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        // SIGNED_IN is a genuine new login — start the absolute-timeout
        // clock. Every other event with a live session (focus checks,
        // token refreshes) just counts as activity for the sliding
        // inactivity window, without resetting the absolute one.
        if (event === 'SIGNED_IN') setMarkerCookie(SESSION_STARTED_COOKIE, SESSION_ABSOLUTE_MAX_AGE)
        setMarkerCookie(LAST_ACTIVE_COOKIE, SESSION_INACTIVITY_MAX_AGE)
        await fetchProfile(session.user.id)
      } else {
        clearMarkerCookie(SESSION_STARTED_COOKIE)
        clearMarkerCookie(LAST_ACTIVE_COOKIE)
        setProfile(null)
      }
      setLoading(false)
    })

    /* App-level session-timeout enforcement — replaces Supabase's
       Pro-only "time-box user sessions" / inactivity controls. If Supabase
       still considers the session valid but either marker cookie has
       expired, force a real sign-out rather than silently letting the
       (up to 400-day) refresh token keep the login alive. */
    const enforceSessionTimeout = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      if (!hasMarkerCookie(SESSION_STARTED_COOKIE) || !hasMarkerCookie(LAST_ACTIVE_COOKIE)) {
        // scope: 'local' — this only ends the session in *this* browser.
        // The default scope is 'global', which revokes the refresh token
        // for every device/tab signed into this account; an idle tab in
        // one window has no business logging out an active session in
        // another.
        await supabase.auth.signOut({ scope: 'local' })
        return
      }
      setMarkerCookie(LAST_ACTIVE_COOKIE, SESSION_INACTIVITY_MAX_AGE)
    }

    /* Force session refresh when page regains focus — catches auth state
       mismatches. Also re-checks the timeout, since a laptop closed for
       days and reopened fires focus, not a fresh page load. */
    const handleFocus = () => { enforceSessionTimeout(); refreshSession() }
    window.addEventListener('focus', handleFocus)

    // A focused-but-idle tab never fires `focus` again, so an interval is
    // the only way to catch "walked away and left it open."
    const timeoutCheckInterval = setInterval(enforceSessionTimeout, 5 * 60 * 1000)
    enforceSessionTimeout()

    return () => {
      clearTimeout(timeout)
      clearInterval(timeoutCheckInterval)
      subscription.unsubscribe()
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchProfile, refreshSession])

  /* Email normalized to lowercase before every sign-in */
  const signIn = async (email: string, password: string): Promise<string | null> => {
    if (!isSupabaseConfigured) return 'Supabase not configured'
    const supabase  = getSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })
    return error ? error.message : null
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) return
    await getSupabaseClient().auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      isAdmin: profile?.role === 'admin',
      isConsignor: profile?.role === 'consignor',
      signIn, signOut, refreshProfile, refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
