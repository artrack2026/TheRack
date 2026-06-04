/*
  Input formatters applied onChange so fields always render in the correct style.
  Rules:
  - Phone:   (123) 456-7890
  - Name:    Capitalize first letter of each word, preserve the rest
             ("McGann" stays "McGann", "john" becomes "John")
  - State:   Both letters uppercase, max 2 chars
  - City:    Capital first letter only
  - Email:   All lowercase
  - ZIP:     Digits only, max 5
*/

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/* Capitalizes only the first character of each word.
   The rest of each word is left exactly as typed.
   "john mcgann" → "John Mcgann"
   "John McGann" → "John McGann"  (preserved)
   "O'brien"     → "O'Brien"      (handles apostrophes too)
*/
export function formatName(value: string): string {
  return value.replace(/(^|[\s'-])\S/g, (char) => char.toUpperCase())
}

export function formatState(value: string): string {
  return value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2)
}

export function formatCity(value: string): string {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatEmail(value: string): string {
  return value.toLowerCase()
}

export function formatZip(value: string): string {
  return value.replace(/\D/g, '').slice(0, 5)
}

/* ── Profile display helpers ──────────────────────────────────────
   Single source of truth for resolving a user's visible name.
   Priority: display_name → first_name → fallback.
   Never uses the email address — splitting on '@' leaks account
   info and produces ugly strings like "mycolab-hub".
──────────────────────────────────────────────────────────────────── */

import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

export function getDisplayName(
  profile: Profile | null | undefined,
  _user?: User | null,
  fallback = 'there'
): string {
  return profile?.display_name || profile?.first_name || fallback
}

export function getAvatarInitial(
  profile: Profile | null | undefined,
  user?: User | null
): string {
  return (
    profile?.display_name?.[0] ??
    profile?.first_name?.[0] ??
    user?.email?.[0] ??
    'U'
  ).toUpperCase()
}
