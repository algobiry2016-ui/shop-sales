-- 004: Allow "unknown" (غير محدد) as order type and pickup/delivery, for past sales
-- entered later whose details nobody remembers. The app only offers it for past dates.

begin;

alter table public.shop_sales drop constraint if exists shop_sales_order_type_check;
alter table public.shop_sales add constraint shop_sales_order_type_check
  check (order_type in ('ready_made', 'custom_arrangement', 'other', 'unknown'));

alter table public.shop_sales drop constraint if exists sales_fulfillment_check;
alter table public.shop_sales drop constraint if exists shop_sales_fulfillment_check;
alter table public.shop_sales add constraint shop_sales_fulfillment_check
  check (fulfillment in ('pickup', 'delivery', 'unknown'));

commit;
