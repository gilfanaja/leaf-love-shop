
-- ROLES
create type public.app_role as enum ('admin', 'customer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'customer',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "users can view own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admins can view all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "view own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

-- handle new user trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "anyone view categories" on public.categories for select using (true);
create policy "admins manage categories" on public.categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- PRODUCTS
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "anyone view products" on public.products for select using (true);
create policy "admins manage products" on public.products for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ORDERS
create type public.order_status as enum ('pending','processed','shipped','completed','cancelled');
create type public.payment_status as enum ('pending','paid','failed');
create type public.payment_method as enum ('cod','transfer','ewallet');

create or replace function public.generate_order_number()
returns text language plpgsql as $$
begin
  return 'GG-' || to_char(now(),'YYYYMMDD') || '-' || lpad(floor(random()*100000)::text, 5, '0');
end; $$;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_number text not null unique default public.generate_order_number(),
  status order_status not null default 'pending',
  payment_method payment_method not null,
  payment_status payment_status not null default 'pending',
  payment_proof_url text,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  notes text,
  subtotal numeric(12,2) not null,
  shipping numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "users view own orders" on public.orders for select to authenticated using (auth.uid() = user_id);
create policy "users insert own orders" on public.orders for insert to authenticated with check (auth.uid() = user_id);
create policy "users update own pending orders" on public.orders for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins view all orders" on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins update all orders" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));

-- ORDER ITEMS
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  price numeric(12,2) not null,
  qty int not null check (qty > 0),
  created_at timestamptz not null default now()
);
alter table public.order_items enable row level security;
create policy "view own order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "insert own order items" on public.order_items for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "admins view all order items" on public.order_items for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger products_updated before update on public.products for each row execute function public.touch_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.touch_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();

-- STORAGE
insert into storage.buckets (id, name, public) values ('product-images','product-images', true);
insert into storage.buckets (id, name, public) values ('payment-proofs','payment-proofs', false);

create policy "public read product images" on storage.objects for select using (bucket_id = 'product-images');
create policy "admins write product images" on storage.objects for all to authenticated
  using (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));

create policy "users upload own proofs" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users view own proofs" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "admins view all proofs" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and public.has_role(auth.uid(),'admin'));

-- SEED
insert into public.categories (name, slug) values
  ('Plants','plants'),('Pots','pots'),('Soil','soil'),('Fertilizer','fertilizer'),('Tools','tools');

insert into public.products (category_id, name, slug, description, price, stock, image_url) values
  ((select id from categories where slug='plants'), 'Monstera Deliciosa', 'monstera-deliciosa', 'Iconic split-leaf tropical plant. Easy to care for and fast growing.', 185000, 24, 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800'),
  ((select id from categories where slug='plants'), 'Snake Plant', 'snake-plant', 'Hardy air-purifying plant, thrives in low light.', 95000, 40, 'https://images.unsplash.com/photo-1593482892290-f54927ae1bb6?w=800'),
  ((select id from categories where slug='plants'), 'Fiddle Leaf Fig', 'fiddle-leaf-fig', 'Statement indoor tree with large violin-shaped leaves.', 320000, 12, 'https://images.unsplash.com/photo-1597055181300-e3633a917056?w=800'),
  ((select id from categories where slug='plants'), 'Pothos Golden', 'pothos-golden', 'Trailing vine perfect for shelves and hanging baskets.', 65000, 60, 'https://images.unsplash.com/photo-1600411833196-7c1f6b1a8b90?w=800'),
  ((select id from categories where slug='pots'), 'Terracotta Pot 20cm', 'terracotta-pot-20', 'Classic breathable terracotta pot with drainage hole.', 45000, 80, 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800'),
  ((select id from categories where slug='pots'), 'Ceramic Pot Matte White', 'ceramic-pot-white', 'Modern matte ceramic pot, 18cm diameter.', 89000, 35, 'https://images.unsplash.com/photo-1602923668104-8f9e03e77e62?w=800'),
  ((select id from categories where slug='pots'), 'Hanging Macrame Pot', 'hanging-macrame', 'Boho macrame hanger with ceramic pot.', 120000, 22, 'https://images.unsplash.com/photo-1531256379416-9f000e90aacc?w=800'),
  ((select id from categories where slug='soil'), 'Premium Potting Mix 5L', 'potting-mix-5l', 'Well-draining indoor plant mix with perlite.', 38000, 100, 'https://images.unsplash.com/photo-1526397751294-331021109fbd?w=800'),
  ((select id from categories where slug='soil'), 'Cactus & Succulent Mix 3L', 'cactus-mix-3l', 'Sandy fast-draining soil for cacti and succulents.', 32000, 70, 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800'),
  ((select id from categories where slug='fertilizer'), 'Organic Liquid Fertilizer 500ml', 'liquid-fertilizer', 'Balanced NPK organic plant food for monthly feeding.', 55000, 50, 'https://images.unsplash.com/photo-1598902108854-10e335adac99?w=800'),
  ((select id from categories where slug='tools'), 'Pruning Shears', 'pruning-shears', 'Sharp stainless steel shears for clean cuts.', 75000, 40, 'https://images.unsplash.com/photo-1599598425947-5fdfc984e0e8?w=800'),
  ((select id from categories where slug='tools'), 'Watering Can 1.5L', 'watering-can', 'Long-spout watering can for indoor plants.', 68000, 45, 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=800');
