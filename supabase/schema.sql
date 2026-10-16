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
  role text not null default 'employee' constraint shop_staff_role_check check (role in (
    'employee',      -- shop coordinator (records shop sales)
    'admin',         -- management: everything, both branches
    'site_manager',  -- website orders manager: assigns florists
    'supervisor',    -- branch supervisor: reviews, assigns reps
    'florist',       -- website florist: prepares orders
    'rep'            -- delivery rep
  )),
  branch text check (branch in ('riyadh', 'khamis')), -- null for admins and shop employees
  telegram_chat_id text, -- personal alerts
  active boolean not null default true,
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

create or replace function public.shop_my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.shop_staff where id = auth.uid();
$$;

create or replace function public.shop_my_branch()
returns text language sql stable security definer set search_path = public as $$
  select branch from public.shop_staff where id = auth.uid();
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
  using (
    id = auth.uid()
    or public.shop_is_admin()
    or (public.shop_my_role() in ('site_manager', 'supervisor') and branch = public.shop_my_branch())
  );

-- Shop employees and managers record sales under their own name only.
drop policy if exists "shop_sales: staff insert own" on public.shop_sales;
create policy "shop_sales: staff insert own" on public.shop_sales
  for insert to authenticated
  with check (employee_id = auth.uid() and public.shop_my_role() in ('employee', 'admin'));

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

-- ─── Orders ────────────────────────────────────────────────────────────────
create table if not exists public.shop_orders (
  id bigint generated always as identity primary key,
  salla_id bigint not null unique,            -- Salla's order id
  reference text,                             -- order number the customer sees
  branch text check (branch in ('riyadh', 'khamis')), -- null until known → shown to managers
  status text not null default 'new' check (status in (
    'scheduled', 'new', 'with_florist', 'ready', 'with_rep', 'with_barq',
    'out_for_delivery', 'delivered', 'canceled'
  )),
  delivery_date date,                         -- Riyadh date the customer picked
  delivery_slot text check (delivery_slot in ('morning', 'afternoon', 'evening')), -- 9–12, 2–7, 7–11
  customer_name text,
  customer_phone text,                        -- 05XXXXXXXX when valid
  recipient_name text,
  recipient_phone text,                       -- 05XXXXXXXX when valid
  city text,
  address text,
  card_message text,
  anonymous boolean not null default false,   -- "هدية من مجهول": hide the sender from the rep
  attachments jsonb not null default '[]',    -- customer's QR link / photo, shown at every step
  items jsonb not null default '[]',          -- [{ name, quantity, image, options }]
  total numeric(10, 2),                       -- what the customer paid
  payment_method text,                        -- Salla's code: mada, credit_card, tabby_installment, tamara_installment…
  delivery_fee numeric(10, 2),                -- delivery charge inside the order (the delivery-area option)
  salla_status text,
  florist_id uuid references public.shop_staff (id),
  rep_id uuid references public.shop_staff (id),
  tracking_number text,                       -- Barq shipment (Riyadh)
  ready_photo text,                           -- storage path of the finished arrangement
  note text,                                  -- latest supervisor / rep note
  raw jsonb,                                  -- the order as Salla sent it
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_orders_branch_status_idx on public.shop_orders (branch, status);
create index if not exists shop_orders_delivery_date_idx on public.shop_orders (delivery_date);

-- Every step of every order: who did what, when. Timing reports come from here.
create table if not exists public.shop_order_events (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.shop_orders (id) on delete cascade,
  at timestamptz not null default now(),
  actor_id uuid references public.shop_staff (id), -- null = system / Salla
  from_status text,
  to_status text not null,
  note text,
  checks jsonb -- handover checklist confirmed at this step, e.g. {"card": true, "qr": true, "photo": true}
);

create index if not exists shop_order_events_order_idx on public.shop_order_events (order_id);

-- Payment fees per method, entered by the managers, for the estimated net per order.
-- Estimates: the real settlement may differ (fixed fees, VAT on fees).
create table if not exists public.shop_payment_fees (
  method text primary key,                    -- Salla's payment_method code
  label text not null,
  percent numeric(5, 2) not null default 0 check (percent >= 0 and percent < 100),
  fixed numeric(10, 2) not null default 0 check (fixed >= 0), -- SAR per transaction
  updated_at timestamptz not null default now()
);

insert into public.shop_payment_fees (method, label) values
  ('mada', 'مدى / Mada'),
  ('credit_card', 'بطاقة ائتمانية / Credit Card'),
  ('tabby_installment', 'تابي / Tabby'),
  ('tamara_installment', 'تمارا / Tamara')
on conflict (method) do nothing;

-- Everything Salla sends, kept as-is for checking and replaying.
create table if not exists public.shop_salla_webhooks (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  event text,
  payload jsonb not null,
  error text
);

-- Salla access tokens. No policies: only the server (secret key) can read it.
create table if not exists public.shop_salla_auth (
  merchant_id bigint primary key,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ─── Row Level Security ────────────────────────────────────────────────────
-- Reads only. Every change goes through the app's server routes, which check the step.
alter table public.shop_orders enable row level security;
alter table public.shop_order_events enable row level security;
alter table public.shop_salla_webhooks enable row level security;
alter table public.shop_salla_auth enable row level security;
alter table public.shop_payment_fees enable row level security;

drop policy if exists "shop_orders: read by branch or assignee" on public.shop_orders;
create policy "shop_orders: read by branch or assignee" on public.shop_orders
  for select to authenticated
  using (
    public.shop_is_admin()
    or (public.shop_my_role() in ('site_manager', 'supervisor') and branch = public.shop_my_branch())
    or florist_id = auth.uid()
    -- Reps read their orders through the app's server, which hides the sender of an
    -- anonymous gift ("هدية من مجهول"), so they get no direct read here.
  );

drop policy if exists "shop_order_events: read with order" on public.shop_order_events;
create policy "shop_order_events: read with order" on public.shop_order_events
  for select to authenticated
  using (exists (select 1 from public.shop_orders o where o.id = order_id)); -- order policy applies

drop policy if exists "shop_payment_fees: admin read" on public.shop_payment_fees;
create policy "shop_payment_fees: admin read" on public.shop_payment_fees
  for select to authenticated
  using (public.shop_is_admin());

drop policy if exists "shop_salla_webhooks: admin read" on public.shop_salla_webhooks;
create policy "shop_salla_webhooks: admin read" on public.shop_salla_webhooks
  for select to authenticated
  using (public.shop_is_admin());

-- Live updates on the boards.
do $$
begin
  alter publication supabase_realtime add table public.shop_orders;
exception when duplicate_object then null;
end $$;
