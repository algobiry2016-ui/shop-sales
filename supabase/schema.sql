-- Shop Sales — database schema
-- Run this whole file once in Supabase → SQL Editor.

-- ─── Profiles (one row per user) ───────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  created_at timestamptz not null default now()
);

-- Create a profile automatically when a user is added in Supabase Auth.
-- The name comes from the user's metadata ("full_name"), falling back to the email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ─── Sales ─────────────────────────────────────────────────────────────────
create table if not exists public.sales (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  employee_id uuid not null default auth.uid() references public.profiles (id),
  order_type text not null check (order_type in ('ready_made', 'custom_arrangement', 'gift_wrapping', 'customer_gift_wrapping')),
  fulfillment text not null check (fulfillment in ('pickup', 'delivery')),
  payment_method text not null check (payment_method in ('cash', 'card')),
  amount numeric(10, 2) not null check (amount > 0),
  customer_name text,
  customer_phone text,
  notes text
);

create index if not exists sales_created_at_idx on public.sales (created_at);

-- ─── Row Level Security ────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.sales enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Employees record sales under their own name only.
drop policy if exists "sales: insert own" on public.sales;
create policy "sales: insert own" on public.sales
  for insert to authenticated
  with check (employee_id = auth.uid());

-- Employees see their own sales; managers see everything.
drop policy if exists "sales: read own or admin" on public.sales;
create policy "sales: read own or admin" on public.sales
  for select to authenticated
  using (employee_id = auth.uid() or public.is_admin());

-- Only managers can delete (e.g. a mistaken entry).
drop policy if exists "sales: admin delete" on public.sales;
create policy "sales: admin delete" on public.sales
  for delete to authenticated
  using (public.is_admin());

-- Live updates on the managers' dashboard.
do $$
begin
  alter publication supabase_realtime add table public.sales;
exception when duplicate_object then null;
end $$;
