'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  /** Right-aligned slot — e.g. "Add Product", "Refresh", "Edit Profile". */
  actions?: ReactNode
  /** `lg` for top-level pages (Shop, About, dashboards); `md` for nested/sub pages. */
  size?: 'md' | 'lg'
  accentColor?: string
  className?: string
  descriptionClassName?: string
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  size = 'lg',
  accentColor = 'var(--color-accent)',
  className = '',
  descriptionClassName = 'max-w-xl',
}: PageHeaderProps) {
  const Heading = size === 'lg' ? 'h1' : 'h2'
  const titleClass = size === 'lg' ? 'text-4xl md:text-5xl font-black' : 'text-3xl font-black'
  const wrapperMargin = size === 'lg' ? 'mb-12' : 'mb-8'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`${wrapperMargin} ${className}`}
    >
      <p
        className="text-xs tracking-[0.3em] uppercase font-semibold mb-2"
        style={{ color: accentColor }}
      >
        {eyebrow}
      </p>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Heading className={titleClass} style={{ color: 'var(--color-text)' }}>
            {title}
          </Heading>
          <div className="h-1 w-14 mt-3" style={{ background: accentColor, borderRadius: 0 }} />
        </div>
        {actions && <div className="shrink-0 pb-1">{actions}</div>}
      </div>

      {description && (
        <div className={`mt-5 text-base leading-relaxed ${descriptionClassName}`} style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </div>
      )}
    </motion.div>
  )
}
