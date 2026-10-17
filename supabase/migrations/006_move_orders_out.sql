-- 006: Website orders moved to their own system (repository website-orders, tables ord_).
-- Undoes 005 so shop sales is back to exactly what it was. The order tables were never
-- used (no orders came in), so nothing is lost. Sales and staff are untouched.

begin;

drop table if exists public.shop_order_events;
drop table if exists public.shop_orders;
drop table if exists public.shop_payment_fees;
drop table if exists public.shop_salla_webhooks;
drop table if exists public.shop_salla_auth;

-- Back to the original policies (the shop_my_role / shop_my_branch helpers go away).
drop policy if exists "shop_sales: staff insert own" on public.shop_sales;
create policy "shop_sales: staff insert own" on public.shop_sales
  for insert to authenticated
  with check (employee_id = auth.uid() and exists (select 1 from public.shop_staff where id = auth.uid()));

drop policy if exists "shop_staff: read own or admin" on public.shop_staff;
create policy "shop_staff: read own or admin" on public.shop_staff
  for select to authenticated
  using (id = auth.uid() or public.shop_is_admin());

drop function if exists public.shop_my_role();
drop function if exists public.shop_my_branch();

alter table public.shop_staff drop column if exists branch;
alter table public.shop_staff drop column if exists telegram_chat_id;
alter table public.shop_staff drop column if exists active;
alter table public.shop_staff drop constraint if exists shop_staff_role_check;
alter table public.shop_staff add constraint shop_staff_role_check check (role in ('employee', 'admin'));

commit;

-- The empty storage bucket "shop-orders" can be deleted from Supabase → Storage (optional).
