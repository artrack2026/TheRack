'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'
import { Profile } from '@/lib/types'

interface AuthContextValue {
  user:    User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  signIn:  (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, loading: true, isAdmin: false,
  signIn: async () => null,
  signOut: async () => {},
  refreshProfile: async () => {},
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
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single()
      setProfile(data ?? null)
    } catch {
      // Profile fetch failed — non-fatal, user is still logged in
      setProfile(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    const supabase = getSupabaseClient()

    // Safety net — never spin forever
    const timeout = setTimeout(() => setLoading(false), 4000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) await fetchProfile(session.user.id)
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [fetchProfile])

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
      signIn, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
