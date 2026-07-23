'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Clock, CheckCircle, Truck, XCircle, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'
import { Order } from '@/lib/types'
import PageHeader from '@/components/PageHeader'

const STATUS_STYLE: Record<string, { color: string; icon: typeof Clock }> = {
  pending:   { color: '#d4b030', icon: Clock },
  paid:      { color: '#3ab870', icon: CheckCircle },
  shipped:   { color: '#3878e0', icon: Truck },
  delivered: { color: '#8844d8', icon: Package },
  cancelled: { color: '#e05858', icon: XCircle },
}

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders]   = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !isSupabaseConfigured) { setLoading(false); return }
    const supabase = getSupabaseClient()
    supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setOrders((data as Order[]) ?? []); setLoading(false) })
  }, [user])

  return (
    <div>
      <PageHeader eyebrow="Purchase History" title="My Orders" size="md" />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : orders.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 flex flex-col items-center gap-4">
          <ShoppingBag size={52} style={{ color: 'var(--color-border)' }} />
          <p className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>No orders yet</p>
          <Link href="/shop" className="cyber-btn text-sm">Browse the Shop</Link>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order, i) => {
            const st = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending
            const Icon = st.icon
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="p-5"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderLeft: `3px solid ${st.color}`,
                  borderRadius: '0 14px 14px 0',
                }}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <span
                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: `${st.color}18`, color: st.color }}
                  >
                    <Icon size={11} /> {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>

                {/* Items */}
                {order.items && order.items.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-3">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span style={{ color: 'var(--color-text)' }}>{item.product_title}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>${item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between text-sm font-bold pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Total</span>
                  <span style={{ color: st.color }}>${order.total.toFixed(2)}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
