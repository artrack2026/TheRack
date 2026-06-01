'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, CheckCircle, MailOpen } from 'lucide-react'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'
import { Inquiry } from '@/lib/types'

const STATUS_COLOR: Record<string, string> = {
  new:     '#e05858',
  read:    '#d4b030',
  replied: '#3ab870',
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading]     = useState(true)

  const load = async () => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    const { data } = await getSupabaseClient()
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })
    setInquiries((data as Inquiry[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: 'read' | 'replied') => {
    if (!isSupabaseConfigured || !id) return
    await getSupabaseClient().from('inquiries').update({ status }).eq('id', id)
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-8">
        <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-1" style={{ color: 'var(--r-orange)' }}>Admin</p>
        <h2 className="text-3xl font-black mb-1" style={{ color: 'var(--color-text)' }}>Inquiries</h2>
        <div className="h-1 w-10" style={{ background: 'var(--r-orange)', borderRadius: 0 }} />
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--color-text-muted)' }}>
          <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
          <p>No inquiries yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {inquiries.map((inq, i) => {
            const st = inq.status ?? 'new'
            const c  = STATUS_COLOR[st]
            return (
              <motion.div
                key={inq.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="p-5"
                style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderLeft: `3px solid ${c}`, borderRadius: '0 14px 14px 0',
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{inq.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{inq.email}{inq.phone ? ` · ${inq.phone}` : ''}</p>
                    {inq.product_title && (
                      <p className="text-xs mt-0.5" style={{ color: c }}>Re: {inq.product_title}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${c}18`, color: c }}>
                      {st}
                    </span>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(inq.created_at ?? '').toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-text-muted)' }}>{inq.message}</p>
                <div className="flex gap-2">
                  {st === 'new' && (
                    <button
                      onClick={() => updateStatus(inq.id!, 'read')}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:bg-white/5"
                      style={{ color: '#d4b030', border: '1px solid #d4b03040', background: 'none', cursor: 'pointer' }}
                    >
                      <MailOpen size={12} /> Mark Read
                    </button>
                  )}
                  {st !== 'replied' && (
                    <button
                      onClick={() => updateStatus(inq.id!, 'replied')}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:bg-white/5"
                      style={{ color: '#3ab870', border: '1px solid #3ab87040', background: 'none', cursor: 'pointer' }}
                    >
                      <CheckCircle size={12} /> Mark Replied
                    </button>
                  )}
                  <a
                    href={`mailto:${inq.email}?subject=Re: Your inquiry${inq.product_title ? ` about ${inq.product_title}` : ''}`}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:bg-white/5 no-underline"
                    style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                  >
                    Reply via Email
                  </a>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
