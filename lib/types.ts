export type ProductCategory = 'artwork' | 'reclaimed' | 'goods'

export interface Product {
  id: string
  title: string
  description: string | null
  price: number
  category: ProductCategory
  images: string[]
  stock_count: number
  featured: boolean
  dimensions?: string | null
  materials?: string | null
  weight_oz?: number | null
  created_at: string
}

export interface Inquiry {
  id?: string
  product_id?: string
  product_title?: string
  name: string
  email: string
  phone?: string
  message: string
  created_at?: string
  status?: 'new' | 'read' | 'replied'
}

export interface ThemeColors {
  background: string
  surface: string
  primary: string
  accent: string
  text: string
  textMuted: string
  border: string
}

/* ── Auth / Profile ── */

export interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  role: 'customer' | 'admin'
  created_at: string
}

/* ── Cart ── */

export interface LocalCartItem {
  id: string          // cart_items row id in Supabase
  product_id: string
  title: string
  category: string
  price: number
  image: string
  quantity: number
}

export interface LocalCart {
  id: string          // carts row id in Supabase
  session_id: string  // UUID stored in localStorage, identifies the guest/session
  expires_at: string  // ISO string — 48 hours after cart creation
  items: LocalCartItem[]
}

/* ── Orders ── */

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_title: string
  product_category: string
  quantity: number
  price: number
  created_at: string
}

export interface Order {
  id: string
  user_id: string | null
  session_id: string | null
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  total: number
  customer_name: string
  customer_email: string
  customer_phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
  created_at: string
  items?: OrderItem[]
}
