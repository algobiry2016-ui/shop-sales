import { NextResponse } from "next/server";
import { FULFILLMENT, ORDER_TYPES, PAYMENT_METHODS } from "@/lib/labels";
import { createClient, getProfile } from "@/lib/supabase/server";
import { formatSaleMessage, notifyManagers } from "@/lib/whatsapp";

const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  // `amount` is the order price without the gift; the stored amount is the total paid.
  const base = Number(body?.amount);
  const giftName = body?.with_gift ? clean(body.gift_name, 100) : null;
  const giftAmount = giftName ? Number(body.gift_amount) : 0;
  const total = Math.round((base + giftAmount) * 100) / 100;
  if (
    !body ||
    !(body.order_type in ORDER_TYPES) ||
    !(body.fulfillment in FULFILLMENT) ||
    !(body.payment_method in PAYMENT_METHODS) ||
    !Number.isFinite(base) ||
    base < 0 ||
    (body.with_gift && !giftName) ||
    !Number.isFinite(giftAmount) ||
    giftAmount < 0 ||
    total <= 0
  ) {
    return NextResponse.json({ error: "بيانات غير صحيحة / Invalid data" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: sale, error } = await supabase
    .from("sales")
    .insert({
      employee_id: profile.id,
      order_type: body.order_type,
      fulfillment: body.fulfillment,
      payment_method: body.payment_method,
      amount: total,
      gift_name: giftName,
      gift_amount: Math.round(giftAmount * 100) / 100,
      customer_name: clean(body.customer_name, 100),
      customer_phone: clean(body.customer_phone, 30),
      notes: clean(body.notes, 500),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await notifyManagers(formatSaleMessage({ ...sale, amount: Number(sale.amount), gift_amount: Number(sale.gift_amount), employee: profile.full_name }));

  return NextResponse.json({ sale });
}
