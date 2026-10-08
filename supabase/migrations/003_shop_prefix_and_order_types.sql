-- 003: Make this system safe to share a Supabase project with the other systems,
-- and replace the two gift-wrapping order types with "other".
--
-- 1. Tables get the shop_ prefix (like wa_ for the WhatsApp system):
--      profiles → shop_staff, sales → shop_sales
-- 2. No more automatic profile for every new login account. A person can use this
--    system only after a manager adds them to shop_staff by name, so accounts of
--    other systems (in a shared project) get no access here.
-- 3. Order types: gift_wrapping / customer_gift_wrapping become other.
-- Existing data is kept.

begin;

alter table public.profiles rename to shop_staff;
alter table public.sales rename to shop_sales;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.shop_is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.shop_staff where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "profiles: read own or admin" on public.shop_staff;
create policy "shop_staff: read own or admin" on public.shop_staff
  for select to authenticated
  using (id = auth.uid() or public.shop_is_admin());

drop policy if exists "sales: insert own" on public.shop_sales;
create policy "shop_sales: staff insert own" on public.shop_sales
  for insert to authenticated
  with check (employee_id = auth.uid() and exists (select 1 from public.shop_staff where id = auth.uid()));

drop policy if exists "sales: read own or admin" on public.shop_sales;
create policy "shop_sales: read own or admin" on public.shop_sales
  for select to authenticated
  using (employee_id = auth.uid() or public.shop_is_admin());

drop policy if exists "sales: admin delete" on public.shop_sales;
create policy "shop_sales: admin delete" on public.shop_sales
  for delete to authenticated
  using (public.shop_is_admin());

drop function if exists public.is_admin();

alter table public.shop_sales drop constraint if exists sales_order_type_check;
update public.shop_sales set order_type = 'other' where order_type in ('gift_wrapping', 'customer_gift_wrapping');
alter table public.shop_sales add constraint shop_sales_order_type_check
  check (order_type in ('ready_made', 'custom_arrangement', 'other'));

commit;
