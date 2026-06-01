'use client'

import {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react'
import { LocalCart, LocalCartItem } from '@/lib/types'
import { useAuth } from '@/components/AuthProvider'

const CART_KEY       = 'artrack-cart-v2'
const CART_HOURS     = 48

interface CartContextValue {
  cart:        LocalCart | null
  itemCount:   number
  isOpen:      boolean
  openCart:    () => void
  closeCart:   () => void
  addItem:     (product: { id: string; title: string; category: string; price: number; image: string }) => Promise<void>
  removeItem:  (cartItemId: string) => Promise<void>
  clearCart:   () => void
  loading:     boolean
}

const CartContext = createContext<CartContextValue>({
  cart: null, itemCount: 0, isOpen: false,
  openCart: () => {}, closeCart: () => {},
  addItem: async () => {}, removeItem: async () => {}, clearCart: () => {},
  loading: false,
})

export function useCart() { return useContext(CartContext) }

function loadLocalCart(): LocalCart | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? (JSON.parse(raw) as LocalCart) : null
  } catch { return null }
}

function saveLocalCart(cart: LocalCart | null) {
  if (typeof window === 'undefined') return
  if (cart) localStorage.setItem(CART_KEY, JSON.stringify(cart))
  else localStorage.removeItem(CART_KEY)
}

function generateUUID(): string {
  return crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
      })
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [cart, setCartState] = useState<LocalCart | null>(null)
  const [isOpen, setIsOpen]  = useState(false)
  const [loading, setLoading] = useState(false)
  const didMount = useRef(false)

  /* Commit cart to localStorage whenever it changes */
  const setCart = useCallback((next: LocalCart | null) => {
    setCartState(next)
    saveLocalCart(next)
  }, [])

  /* On mount: load cart, check 48-hr expiry */
  useEffect(() => {
    if (didMount.current) return
    didMount.current = true

    const stored = loadLocalCart()
    if (!stored) { setCart(null); return }

    const expired = new Date(stored.expires_at) < new Date()
    if (expired) {
      /* Tell server to restore stock then wipe local state */
      fetch('/api/cart/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: stored.id }),
      }).finally(() => setCart(null))
    } else {
      setCart(stored)
    }
  }, [setCart])

  /* When user logs in, merge session cart → user cart on server */
  useEffect(() => {
    if (!user || !cart?.session_id) return
    fetch('/api/cart/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: cart.session_id, userId: user.id }),
    }).then(r => r.ok ? r.json() : null).then(data => {
      if (data?.cart) setCart(data.cart)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const openCart  = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const addItem = useCallback(async (product: {
    id: string; title: string; category: string; price: number; image: string
  }) => {
    setLoading(true)
    try {
      const sessionId = cart?.session_id ?? generateUUID()

      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          sessionId,
          userId: user?.id ?? null,
          existingCartId: cart?.id ?? null,
          price: product.price,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Could not add item')
      }

      const data = await res.json() as {
        cartId: string
        cartItemId: string
        expiresAt: string
      }

      const newItem: LocalCartItem = {
        id: data.cartItemId,
        product_id: product.id,
        title: product.title,
        category: product.category,
        price: product.price,
        image: product.image,
        quantity: 1,
      }

      const existing = cart?.items.find(i => i.product_id === product.id)
      const nextItems = existing
        ? cart!.items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...(cart?.items ?? []), newItem]

      const nextCart: LocalCart = {
        id: data.cartId,
        session_id: sessionId,
        expires_at: data.expiresAt,
        items: nextItems,
      }
      setCart(nextCart)
      setIsOpen(true)
    } catch (e) {
      console.error('addItem error:', e)
    } finally {
      setLoading(false)
    }
  }, [cart, user, setCart])

  const removeItem = useCallback(async (cartItemId: string) => {
    if (!cart) return
    setLoading(true)
    try {
      const res = await fetch(`/api/cart/items/${cartItemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: cart.id }),
      })
      if (!res.ok) throw new Error('Remove failed')

      const nextItems = cart.items.filter(i => i.id !== cartItemId)
      if (nextItems.length === 0) {
        setCart(null)
      } else {
        setCart({ ...cart, items: nextItems })
      }
    } catch (e) {
      console.error('removeItem error:', e)
    } finally {
      setLoading(false)
    }
  }, [cart, setCart])

  const clearCart = useCallback(() => setCart(null), [setCart])

  const itemCount = cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0

  return (
    <CartContext.Provider value={{
      cart, itemCount, isOpen, openCart, closeCart,
      addItem, removeItem, clearCart, loading,
    }}>
      {children}
    </CartContext.Provider>
  )
}
