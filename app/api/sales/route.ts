import { NextResponse } from "next/server";
import { FULFILLMENT, ORDER_TYPES, PAYMENT_METHODS } from "@/lib/labels";
import { createClient, getProfile } from "@/lib/supabase/server";
import { isDate, localDate } from "@/lib/time";
import { formatSaleMessage, notifyManagers } from "@/lib/notify";

const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/**
 * Saudi mobile in one format (05XXXXXXXX) so shop orders can be matched by phone in the
 * delivery system. Accepts 05…, 5…, 9665…, +9665…, 009665…; returns null otherwise.
 */
function saudiMobile(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const digits = v.replace(/\D/g, "").replace(/^00/, "").replace(/^966/, "").replace(/^0/, "");
  return /^5\d{8}$/.test(digits) ? `0${digits}` : null;
}

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  // `amount` is the order price without the gift; the stored amount is the total paid.
  const base = Number(body?.amount);
  const giftName = body?.with_gift ? clean(body.gift_name, 100) : null;
  const giftAmount = giftName ? Number(body.gift_amount) : 0;
  const total = Math.round((base + giftAmount) * 100) / 100;
  // Managers can enter past sales; they are stamped at noon Riyadh time on that date.
  const saleDate = body?.sale_date;
  const backdated = isDate(saleDate) && saleDate !== localDate();
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
    total <= 0 ||
    // "Other" needs a description.
    (body.order_type === "other" && !clean(body.notes, 500)) ||
    // "Not specified" is only accepted for past sales.
    ((body.order_type === "unknown" || body.fulfillment === "unknown") && !backdated) ||
    (saleDate != null && !isDate(saleDate)) ||
    (backdated && (profile.role !== "admin" || saleDate > localDate()))
  ) {
    return NextResponse.json({ error: "بيانات غير صحيحة / Invalid data" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: sale, error } = await supabase
    .from("shop_sales")
    .insert({
      employee_id: profile.id,
      order_type: body.order_type,
      fulfillment: body.fulfillment,
      payment_method: body.payment_method,
      amount: total,
      gift_name: giftName,
      gift_amount: Math.round(giftAmount * 100) / 100,
      customer_name: clean(body.customer_name, 100),
      customer_phone: saudiMobile(body.customer_phone) ?? clean(body.customer_phone, 30),
      notes: clean(body.notes, 500),
      ...(backdated ? { created_at: new Date(`${saleDate}T12:00:00+03:00`).toISOString() } : {}),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Past sales entered by a manager don't trigger a Telegram alert.
  if (!backdated) await notifyManagers(formatSaleMessage({ ...sale, amount: Number(sale.amount), gift_amount: Number(sale.gift_amount), employee: profile.full_name }));

  return NextResponse.json({ sale });
}
