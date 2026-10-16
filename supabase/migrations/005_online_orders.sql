-- 005: Online orders from Salla (website orders cycle).
--
-- Cycle: scheduled → new → with_florist → ready → with_rep / with_barq → out_for_delivery
--        → delivered; any step → canceled. A failed delivery goes back to "ready" with the
--        supervisor (the order waits in the fridge for another rep).
--
-- Two branches (Riyadh, Khamis Mushait). Each order belongs to one branch, and the branch
-- staff see only their branch. Managers (admin) see both.
--
-- Safe for the live system: existing shop staff, sales and policies keep working. The
-- only tightened rule is that recording a shop sale now needs the employee or admin role,
-- so the new roles (reps, website florists…) can't record shop sales.

begin;

-- ─── Staff: new roles, branch, personal Telegram chat ──────────────────────
-- The live table was created as "profiles", so its check may still carry that name.
alter table public.shop_staff drop constraint if exists profiles_role_check;
alter table public.shop_staff drop constraint if exists shop_staff_role_check;
alter table public.shop_staff add constraint shop_staff_role_check
  check (role in (
    'employee',      -- shop coordinator (records shop sales)
    'admin',         -- management: everything, both branches
    'site_manager',  -- website orders manager (Youssef, Rashid): assigns florists
    'supervisor',    -- branch supervisor (Ibrahim, Ahmed): reviews, assigns reps
    'florist',       -- website florist: prepares orders
    'rep'            -- delivery rep
  ));

alter table public.shop_staff add column if not exists branch text
  check (branch in ('riyadh', 'khamis'));       -- null for admins and shop employees
alter table public.shop_staff add column if not exists telegram_chat_id text; -- personal alerts
alter table public.shop_staff add column if not exists active boolean not null default true;

-- The signed-in person's role and branch (used by the policies below).
create or replace function public.shop_my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.shop_staff where id = auth.uid();
$$;

create or replace function public.shop_my_branch()
returns text language sql stable security definer set search_path = public as $$
  select branch from public.shop_staff where id = auth.uid();
$$;

-- Shop sales: only shop employees and managers record them.
drop policy if exists "shop_sales: staff insert own" on public.shop_sales;
create policy "shop_sales: staff insert own" on public.shop_sales
  for insert to authenticated
  with check (employee_id = auth.uid() and public.shop_my_role() in ('employee', 'admin'));

-- Branch staff see colleagues in their branch (to pick a florist or rep).
drop policy if exists "shop_staff: read own or admin" on public.shop_staff;
create policy "shop_staff: read own or admin" on public.shop_staff
  for select to authenticated
  using (
    id = auth.uid()
    or public.shop_is_admin()
    or (public.shop_my_role() in ('site_manager', 'supervisor') and branch = public.shop_my_branch())
  );

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
  delivery_area text,                         -- area option: خميس مشيط، أبها، الفرعاء… (Khamis products)
  pickup boolean not null default false,      -- "استلام من المتجر": no rep needed
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

commit;
