import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ThemeProvider from '@/components/ThemeProvider'
import AuthProvider from '@/components/AuthProvider'
import CartProvider from '@/components/CartProvider'
import CartDrawer from '@/components/CartDrawer'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { isSupabaseConfigured, createSupabasePublicClient } from '@/lib/supabase'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

const BASE_METADATA = {
  title: 'Art-R-Ack — Art, Reclaimed & Goods',
  description: 'Unique artwork, reclaimed treasures, and hand-selected goods curated for bold individuals.',
  openGraph: {
    title: 'Art-R-Ack',
    description: 'Unique artwork, reclaimed treasures, and hand-selected goods.',
    type: 'website' as const,
  },
}

/** Icons are chosen from Admin -> Showroom Settings -> Branding rather than
 *  fixed at build time (Next.js's app/icon.png file convention), so a
 *  changed selection takes effect on the next page load, no redeploy.
 *  Falls back to option 1 for anything unconfigured/unreachable, so a
 *  Supabase hiccup never means a missing favicon. */
export async function generateMetadata(): Promise<Metadata> {
  let appleIconChoice = '1'
  let tabIconChoice = '1'

  if (isSupabaseConfigured) {
    try {
      const { data } = await createSupabasePublicClient()
        .from('showroom_settings')
        .select('apple_icon_choice, tab_icon_choice')
        .eq('id', 1)
        .single()
      if (data?.apple_icon_choice === '2') appleIconChoice = '2'
      if (data?.tab_icon_choice === '2') tabIconChoice = '2'
    } catch {
      // Fall back to option 1 — see comment above
    }
  }

  return {
    ...BASE_METADATA,
    icons: {
      icon: `/icons/tab-icon-${tabIconChoice}.png`,
      apple: `/icons/apple-icon-${appleIconChoice}.png`,
    },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <Navbar />
              <CartDrawer />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
