'use client'

import LogoText from '@/components/LogoText'

interface Props {
  /** `sm` for the persistent header/navbar; `lg` for the homepage hero moment. */
  size?: 'sm' | 'lg'
  /** Mirrored, faded reflection beneath the wordmark — the site's grounding focal mark. */
  reflection?: boolean
  className?: string
}

export default function LogoLockup({ size = 'lg', reflection = true, className = '' }: Props) {
  const textClass = size === 'lg' ? 'text-6xl md:text-8xl' : 'text-2xl'

  return (
    <div className={className} style={{ lineHeight: 1, textAlign: 'center' }}>
      <LogoText className={textClass} />

      {reflection && (
        <>
          <div
            style={{
              height: size === 'lg' ? '1.5px' : '1px',
              margin: size === 'lg' ? '8px 0 5px' : '3px 0 2px',
              background: 'linear-gradient(90deg, transparent, #d4b030, #3ab870, #1ab4c0, transparent)',
            }}
          />
          <div
            style={{
              transform: 'scaleY(-1)',
              opacity: size === 'lg' ? 0.45 : 0.32,
              maskImage: `linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent ${size === 'lg' ? '90%' : '70%'})`,
              WebkitMaskImage: `linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent ${size === 'lg' ? '90%' : '70%'})`,
              pointerEvents: 'none',
              display: 'block',
            }}
          >
            <LogoText className={textClass} />
          </div>
        </>
      )}
    </div>
  )
}
