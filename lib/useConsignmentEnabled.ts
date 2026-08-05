'use client'

import { useEffect, useState } from 'react'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'

/** Whether the Consignment feature is currently switched on
 *  (Admin → Showroom Settings → Consignment). Used to gate the nav link,
 *  the /consignment and /shop/custome-r-curations pages, and the Shop
 *  page's promo callout. `loading` lets callers avoid a flash of the
 *  wrong state before the first fetch resolves. */
export function useConsignmentEnabled(): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    const load = async () => {
      try {
        const { data } = await getSupabaseClient()
          .from('showroom_settings')
          .select('consignment_enabled')
          .eq('id', 1)
          .single()
        setEnabled(!!data?.consignment_enabled)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { enabled, loading }
}
