import { after, NextResponse } from "next/server";
import { AREAS, FULFILLMENT, ORDER_TYPES, PAYMENT_METHODS, SLOTS, type Delivery } from "@/lib/labels";
import { sendDelivery } from "@/lib/orders-link";
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
  // Managers can enter past sales; they are stamped at noon Riyadh time on that date.
  const saleDate = body?.sale_date;
  const backdated = isDate(saleDate) && saleDate !== localDate();
  // A delivery today or later goes to the orders system's supervisor (a past one is a record only):
  // where, when, the card and the recipient. Its fee is part of the total paid.
  const delivering = body?.fulfillment === "delivery" && !backdated;
  const d = (delivering ? body.delivery : null) as Record<string, unknown> | null;
  const area = typeof d?.area === "string" ? d.area.trim().slice(0, 100) : "";
  const fee = delivering ? Number(d?.fee ?? AREAS.find((a) => a.name === area)?.fee ?? 0) : 0;
  const delivery: Delivery | null = delivering
    ? {
        area,
        date: isDate(d?.date) ? (d.date as string) : localDate(),
        slot: typeof d?.slot === "string" && d.slot in SLOTS ? (d.slot as Delivery["slot"]) : null,
        card_message: clean(d?.card_message, 1000),
        recipient_phone: saudiMobile(d?.recipient_phone) ?? clean(d?.recipient_phone, 30),
      }
    : null;
  const total = Math.round((base + giftAmount + fee) * 100) / 100;
  if (delivery) {
    if (!delivery.area || !Number.isFinite(fee) || fee < 0) return NextResponse.json({ error: "اختر منطقة التوصيل / Pick the delivery area" }, { status: 400 });
    if (delivery.date < localDate()) return NextResponse.json({ error: "يوم التوصيل فات / That day has passed" }, { status: 400 });
    if (!clean(body.customer_phone, 30) && !delivery.recipient_phone) return NextResponse.json({ error: "اكتب جوال العميل أو المستلم عشان المندوب يتصل / Add a mobile for the rep" }, { status: 400 });
  }
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
      delivery,
      delivery_fee: Math.round(fee * 100) / 100,
      ...(backdated ? { created_at: new Date(`${saleDate}T12:00:00+03:00`).toISOString() } : {}),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Past sales entered by a manager don't trigger a Telegram alert. The alert is sent
  // after the response, so the coordinator doesn't wait on Telegram to see "Saved".
  if (!backdated) after(() => notifyManagers(formatSaleMessage({ ...sale, amount: Number(sale.amount), gift_amount: Number(sale.gift_amount), employee: profile.full_name })));

  // A delivery: on to the supervisor now, so the coordinator sees it arrived (or can resend).
  const sent = delivery ? await sendDelivery(sale.id, body.photo) : null;
  return NextResponse.json({ sale, delivery_error: sent });
}
