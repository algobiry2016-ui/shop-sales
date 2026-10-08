import { NextResponse } from "next/server";
import { FULFILLMENT, ORDER_TYPES, PAYMENT_METHODS } from "@/lib/labels";
import { createClient, getProfile } from "@/lib/supabase/server";
import { formatSaleMessage, notifyManagers } from "@/lib/whatsapp";

const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);
  if (
    !body ||
    !(body.order_type in ORDER_TYPES) ||
    !(body.fulfillment in FULFILLMENT) ||
    !(body.payment_method in PAYMENT_METHODS) ||
    !Number.isFinite(amount) ||
    amount <= 0
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
      amount: Math.round(amount * 100) / 100,
      customer_name: clean(body.customer_name, 100),
      customer_phone: clean(body.customer_phone, 30),
      notes: clean(body.notes, 500),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await notifyManagers(formatSaleMessage({ ...sale, amount: Number(sale.amount), employee: profile.full_name }));

  return NextResponse.json({ sale });
}
