'use client'

import Link from 'next/link'
import { AtSign, Mail, Heart, Shield } from 'lucide-react'
import LogoText from '@/components/LogoText'

/* WillowRoo Media credit — mirrors their brand mark: brushed silver "Willow"
   paired with metallic gold "Roo", same two-tone split as their logo. */
const willowGradient = {
  background: 'linear-gradient(160deg, #ffffff, #b8b8b8 45%, #e8e8e8 55%, #9a9a9a)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
}
const rooGradient = {
  background: 'linear-gradient(160deg, #f0cf7a, #c8902a 45%, #e8c468 55%, #a3701c)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
}

export default function Footer() {
  return (
    <footer
      className="mt-24"
      style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Brand */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <LogoText className="text-xl" />
            </Link>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
              Unique artwork, reclaimed treasures, and hand-selected goods — curated for those who dare to be different.
            </p>
          </div>

          {/* Nav links */}
          <div>
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ color: 'var(--color-primary)' }}
            >
              Navigate
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                { href: '/shop',     label: 'Shop' },
                { href: '/about',    label: 'About' },
                { href: '/contact',  label: 'Contact' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm transition-colors hover:text-white"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ color: 'var(--color-accent)' }}
            >
              Connect
            </p>
            <div className="flex flex-col gap-2.5">
              <a
                href="mailto:hello@artrack.com"
                className="text-sm flex items-center gap-2 transition-colors hover:text-white"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Mail size={14} /> hello@artrack.com
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm flex items-center gap-2 transition-colors hover:text-white"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <AtSign size={14} /> @artrack
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Link
            href="/admin"
            className="text-xs flex items-center gap-1 transition-colors hover:opacity-80"
            style={{ color: '#6b6560' }}
          >
            <Shield size={10} /> Admin
          </Link>
          <div className="flex flex-col items-center md:items-end gap-1.5">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              © {new Date().getFullYear()} Art-R-Ack. All rights reserved.
            </p>
            <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Made with <Heart size={11} style={{ color: 'var(--r-red)' }} /> for art lovers by{' '}
              <a
                href="https://www.willowroo.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold tracking-tight transition-opacity hover:opacity-80"
              >
                <span style={willowGradient}>Willow</span>
                <span style={rooGradient}>Roo</span>
                <span style={willowGradient}> Media</span>
              </a>.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
