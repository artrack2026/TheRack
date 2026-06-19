import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'

/* ── Database type ──────────────────────────────────────────────────────────
   Supabase's GenericSchema (v2.x) requires Tables, Views, Functions, Enums.
   GenericTable requires Row, Insert, Update, AND Relationships.
   Missing any field causes Schema = never → all .from() results are `never`.
─────────────────────────────────────────────────────────────────────────── */

type Rel = never[]   // no FK relationships defined; satisfies GenericRelationship[]

export interface Database {
  public: {
    Views:          Record<string, never>
    Functions:      Record<string, never>
    Enums:          Record<string, never>
    CompositeTypes: Record<string, never>
    Tables: {
      products: {
        Row: {
          id: string
          title: string
          description: string | null
          price: number
          category: 'artwork' | 'reclaimed' | 'goods'
          images: string[]
          stock_count: number
          featured: boolean
          dimensions: string | null
          materials: string | null
          weight_oz: number | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          price: number
          category: 'artwork' | 'reclaimed' | 'goods'
          images?: string[]
          stock_count?: number
          featured?: boolean
          dimensions?: string | null
          materials?: string | null
          weight_oz?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          price?: number
          category?: 'artwork' | 'reclaimed' | 'goods'
          images?: string[]
          stock_count?: number
          featured?: boolean
          dimensions?: string | null
          materials?: string | null
          weight_oz?: number | null
          created_at?: string
        }
        Relationships: Rel
      }
      inquiries: {
        Row: {
          id: string
          product_id: string | null
          product_title: string | null
          name: string
          email: string
          phone: string | null
          message: string
          status: 'new' | 'read' | 'replied'
          created_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          product_title?: string | null
          name: string
          email: string
          phone?: string | null
          message: string
          status?: 'new' | 'read' | 'replied'
          created_at?: string
        }
        Update: {
          product_id?: string | null
          product_title?: string | null
          name?: string
          email?: string
          phone?: string | null
          message?: string
          status?: 'new' | 'read' | 'replied'
          created_at?: string
        }
        Relationships: Rel
      }
      profiles: {
        Row: {
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
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          display_name?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          role?: 'customer' | 'admin'
          birthday?: string | null
          created_at?: string
        }
        Update: {
          email?: string
          first_name?: string | null
          last_name?: string | null
          display_name?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          role?: 'customer' | 'admin'
          birthday?: string | null
          created_at?: string
        }
        Relationships: Rel
      }
      carts: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          user_id?: string | null
          session_id?: string | null
          expires_at?: string
        }
        Relationships: Rel
      }
      cart_items: {
        Row: {
          id: string
          cart_id: string
          product_id: string
          quantity: number
          price_at_add: number
          created_at: string
        }
        Insert: {
          id?: string
          cart_id: string
          product_id: string
          quantity?: number
          price_at_add: number
          created_at?: string
        }
        Update: {
          quantity?: number
          price_at_add?: number
        }
        Relationships: Rel
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          status: 'new' | 'in_process' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
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
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          status?: 'new' | 'in_process' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
          total: number
          shipping_total?: number
          tax_total?: number
          amount_paid?: number
          customer_name: string
          customer_email: string
          customer_phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_detail?: string | null
          payment_instructions?: string | null
          created_at?: string
        }
        Update: {
          status?: 'new' | 'in_process' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
          total?: number
          shipping_total?: number
          tax_total?: number
          amount_paid?: number
          customer_name?: string
          customer_email?: string
          customer_phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_detail?: string | null
          payment_instructions?: string | null
        }
        Relationships: Rel
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_title: string
          product_category: string
          quantity: number
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_title: string
          product_category: string
          quantity?: number
          price: number
          created_at?: string
        }
        Update: {
          quantity?: number
          price?: number
        }
        Relationships: Rel
      }
      showroom_settings: {
        Row: {
          id: number
          products_per_row: number
          rows_per_page: number
          inquiry_email: string
          instagram: string | null
          facebook: string | null
          x: string | null
          tiktok: string | null
          snapchat: string | null
          youtube: string | null
          linkedin: string | null
          threads: string | null
          bluesky: string | null
          mastodon: string | null
          tax_rate: number
          shipping_fee: number
          free_shipping_threshold: number
          payment_methods: unknown
          two_factor_enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          products_per_row?: number
          rows_per_page?: number
          inquiry_email?: string
          instagram?: string | null
          facebook?: string | null
          x?: string | null
          tiktok?: string | null
          snapchat?: string | null
          youtube?: string | null
          linkedin?: string | null
          threads?: string | null
          bluesky?: string | null
          mastodon?: string | null
          tax_rate?: number
          shipping_fee?: number
          free_shipping_threshold?: number
          payment_methods?: unknown
          two_factor_enabled?: boolean
          updated_at?: string
        }
        Update: {
          products_per_row?: number
          rows_per_page?: number
          inquiry_email?: string
          instagram?: string | null
          facebook?: string | null
          x?: string | null
          tiktok?: string | null
          snapchat?: string | null
          youtube?: string | null
          linkedin?: string | null
          threads?: string | null
          bluesky?: string | null
          mastodon?: string | null
          tax_rate?: number
          shipping_fee?: number
          free_shipping_threshold?: number
          payment_methods?: unknown
          two_factor_enabled?: boolean
          updated_at?: string
        }
        Relationships: Rel
      }
      login_otp_challenges: {
        Row: {
          id: string
          user_id: string
          code_hash: string
          attempts: number
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          code_hash: string
          attempts?: number
          expires_at: string
          created_at?: string
        }
        Update: {
          attempts?: number
        }
        Relationships: Rel
      }
    }
  }
}

/* ── Config ── */

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

/* ── Browser / data client ──
   Must use createBrowserClient (not createClient) so the session is stored
   in BOTH localStorage AND cookies. The middleware reads cookies to check auth —
   if we use plain createClient the middleware never sees the session and
   redirects every protected route back to /login.
── */

export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local')
  }
  // createBrowserClient is internally a singleton keyed by URL+anonKey
  return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!)
}

/* ── Server client (API routes / middleware) ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupabaseServerClient(cookieStore: any) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured.')
  return createServerClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(toSet: { name: string; value: string; options?: object }[]) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // ReadonlyRequestCookies in Server Components — safe to ignore
        }
      },
    },
  })
}

/* ── Admin client (service role — server only) ── */

export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations.')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/* ── Full database migration SQL ── */

export const supabaseMigration = `
-- ── Existing tables ──────────────────────────────────────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric(10,2) not null,
  category text check (category in ('artwork','reclaimed','goods')) not null,
  images jsonb default '[]',
  stock_count integer default 1,
  featured boolean default false,
  dimensions text,
  materials text,
  weight_oz numeric(8,2),
  created_at timestamptz default now()
);

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  product_title text,
  name text not null,
  email text not null,
  phone text,
  message text not null,
  status text check (status in ('new','read','replied')) default 'new',
  created_at timestamptz default now()
);

-- ── Auth profiles ──────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  role text check (role in ('customer','admin')) not null default 'customer',
  created_at timestamptz default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Cart tables ───────────────────────────────────────────────────
create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  expires_at timestamptz not null default (now() + interval '48 hours'),
  created_at timestamptz default now(),
  constraint carts_has_owner check (user_id is not null or session_id is not null)
);

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  price_at_add numeric(10,2) not null,
  created_at timestamptz default now()
);

-- ── Orders ────────────────────────────────────────────────────────
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  status text check (status in ('new','in_process','ready_to_ship','shipped','delivered','cancelled','refunded')) not null default 'new',
  total numeric(10,2) not null,
  shipping_total numeric(10,2) not null default 0,
  tax_total numeric(10,2) not null default 0,
  amount_paid numeric(10,2) not null default 0,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  notes text,
  payment_method text,
  payment_detail text,
  payment_instructions text,
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_title text not null,
  product_category text not null,
  quantity integer not null default 1,
  price numeric(10,2) not null,
  created_at timestamptz default now()
);

create table if not exists showroom_settings (
  id integer primary key default 1,
  products_per_row integer default 4,
  rows_per_page integer default 2,
  inquiry_email text default '',
  instagram text,
  facebook text,
  x text,
  tiktok text,
  snapchat text,
  youtube text,
  linkedin text,
  threads text,
  bluesky text,
  mastodon text,
  tax_rate numeric default 0,
  shipping_fee numeric default 0,
  free_shipping_threshold numeric default 0,
  payment_methods jsonb default '[]',
  two_factor_enabled boolean default false,
  updated_at timestamptz default now(),
  constraint showroom_settings_id_check check (id = 1)
);

-- ── Login 2FA (Textbelt SMS) ─────────────────────────────────────
-- One-time codes for the post-password verification step. Service-role
-- only — no public/authenticated policies, so RLS denies all client access.
create table if not exists login_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- ── Row-Level Security ────────────────────────────────────────────
alter table products    enable row level security;
alter table inquiries   enable row level security;
alter table profiles    enable row level security;
alter table carts       enable row level security;
alter table cart_items  enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table showroom_settings enable row level security;
alter table login_otp_challenges enable row level security;

create policy "products_public_read"   on products for select using (true);
create policy "products_admin_all"     on products for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "inquiries_insert"       on inquiries for insert with check (true);
create policy "inquiries_admin_all"    on inquiries for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "profiles_own_select"    on profiles for select using (auth.uid() = id);
create policy "profiles_own_update"    on profiles for update using (auth.uid() = id);
create policy "profiles_admin_select"  on profiles for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "carts_open"             on carts for all using (true);
create policy "cart_items_open"        on cart_items for all using (true);

create policy "orders_own"             on orders for select using (auth.uid() = user_id);
create policy "orders_insert"          on orders for insert with check (true);
create policy "orders_admin"           on orders for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "order_items_open"       on order_items for all using (true);

create policy "showroom_settings_public_read" on showroom_settings for select using (true);
create policy "showroom_settings_admin_update" on showroom_settings for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
`
