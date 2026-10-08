-- Shop Sales — database schema (fresh install).
-- Run this whole file once in Supabase → SQL Editor.
-- Existing databases: run the files in supabase/migrations/ instead.
--
-- Every table starts with shop_ so this system can share a Supabase project
-- with the other systems (like wa_ for the WhatsApp system).

-- ─── Staff: who may use this system ────────────────────────────────────────
-- A login account (Authentication → Users) has no access here until a manager
-- adds it to this table by name.
create table if not exists public.shop_staff (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.shop_is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.shop_staff where id = auth.uid() and role = 'admin');
$$;

-- ─── Sales ─────────────────────────────────────────────────────────────────
create table if not exists public.shop_sales (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  employee_id uuid not null default auth.uid() references public.shop_staff (id),
  order_type text not null constraint shop_sales_order_type_check check (order_type in ('ready_made', 'custom_arrangement', 'other', 'unknown')),
  fulfillment text not null constraint shop_sales_fulfillment_check check (fulfillment in ('pickup', 'delivery', 'unknown')),
  payment_method text not null check (payment_method in ('cash', 'card')),
  amount numeric(10, 2) not null check (amount > 0), -- total paid, including any gift
  gift_name text,
  gift_amount numeric(10, 2) not null default 0 check (gift_amount >= 0),
  customer_name text,
  customer_phone text, -- stored as 05XXXXXXXX when valid; links shop orders to the delivery system
  notes text
);

create index if not exists shop_sales_created_at_idx on public.shop_sales (created_at);

-- ─── Row Level Security ────────────────────────────────────────────────────
alter table public.shop_staff enable row level security;
alter table public.shop_sales enable row level security;

drop policy if exists "shop_staff: read own or admin" on public.shop_staff;
create policy "shop_staff: read own or admin" on public.shop_staff
  for select to authenticated
  using (id = auth.uid() or public.shop_is_admin());

-- Staff record sales under their own name only.
drop policy if exists "shop_sales: staff insert own" on public.shop_sales;
create policy "shop_sales: staff insert own" on public.shop_sales
  for insert to authenticated
  with check (employee_id = auth.uid() and exists (select 1 from public.shop_staff where id = auth.uid()));

-- Staff see their own sales; managers see everything.
drop policy if exists "shop_sales: read own or admin" on public.shop_sales;
create policy "shop_sales: read own or admin" on public.shop_sales
  for select to authenticated
  using (employee_id = auth.uid() or public.shop_is_admin());

-- Only managers can delete (e.g. a mistaken entry).
drop policy if exists "shop_sales: admin delete" on public.shop_sales;
create policy "shop_sales: admin delete" on public.shop_sales
  for delete to authenticated
  using (public.shop_is_admin());

-- Live updates on the managers' dashboard.
do $$
begin
  alter publication supabase_realtime add table public.shop_sales;
exception when duplicate_object then null;
end $$;
