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
  birthday: string | null
  created_at: string
}

/* ── Payment ── */

export type PaymentMethodType = 'instruction' | 'redirect' | 'stripe' | 'square'

export interface PaymentMethod {
  id: string
  name: string
  enabled: boolean
  type: PaymentMethodType
  icon: string
  detail?: string
  instructions?: string
  /** Only used when type === 'redirect' — the customer is sent here to pay
   *  (e.g. a paypal.me/venmo.com/cash.app payment link). */
  redirect_url?: string
  sort_order: number
}

export interface CheckoutSettings {
  tax_rate: number
  shipping_fee: number
  free_shipping_threshold: number
  payment_methods: PaymentMethod[]
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

export type OrderStatus =
  | 'new' | 'in_process' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

export interface Order {
  id: string
  user_id: string | null
  session_id: string | null
  status: OrderStatus
  total: number
  shipping_total: number
  tax_total: number
  amount_paid: number
  customer_name: string
  customer_email: string
  customer_phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
  payment_method: string | null
  payment_detail: string | null
  payment_instructions: string | null
  created_at: string
  items?: OrderItem[]
}
