-- Gifts sold with an order (e.g. a necklace with a flower arrangement).
-- sales.amount stays the total paid; gift_amount is the part of it that was for the gift.
alter table public.sales add column if not exists gift_name text;
alter table public.sales add column if not exists gift_amount numeric(10, 2) not null default 0 check (gift_amount >= 0);
