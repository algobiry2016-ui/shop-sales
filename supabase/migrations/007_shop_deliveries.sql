-- 007: a delivery sale goes to the orders system (website-orders), straight to the supervisor.
-- When a sale is "توصيل", its delivery details are kept with it: where (area), when (day and
-- period), the card message and the recipient's mobile. The delivery fee is its own amount
-- (part of the total paid). The orders system's server builds its order from this row and
-- writes back the order's id, so a resend never makes a second order. Nothing else changes:
-- staff still add their own sales only, and only managers delete.
begin;

alter table public.shop_sales add column if not exists delivery jsonb;          -- { area, date, slot, card_message, recipient_phone }
alter table public.shop_sales add column if not exists delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0);
alter table public.shop_sales add column if not exists ord_order_id bigint;     -- its order in ord_orders, once it reached the supervisor

commit;
