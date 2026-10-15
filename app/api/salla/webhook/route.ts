import { NextResponse } from "next/server";
import { notifyManagers } from "@/lib/notify";
import { isSallaCanceled, parseSallaOrder, verifySallaSignature } from "@/lib/salla";
import { createAdminClient } from "@/lib/supabase/admin";

// Salla calls this for every store event (Salla Partners → the app → Webhooks).
// Every payload is saved as-is first, so nothing is lost while the parsing is being tuned.
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifySallaSignature(raw, request.headers.get("x-salla-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SECRET_KEY is not set in Vercel" }, { status: 500 });

  const body = JSON.parse(raw) as { event?: string; merchant?: number; data?: Record<string, unknown> };
  const event = body.event ?? null;
  const data = body.data ?? {};
  const { data: log } = await supabase.from("shop_salla_webhooks").insert({ event, payload: body }).select("id").single();

  try {
    if (event === "app.store.authorize") {
      // Easy mode: Salla hands over the store's tokens when the app is installed.
      const expires = Number(data.expires);
      const { error } = await supabase.from("shop_salla_auth").upsert({
        merchant_id: body.merchant,
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? null,
        expires_at: expires ? new Date(expires * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    } else if (event === "order.created") {
      const order = parseSallaOrder(data);
      const { data: row, error } = await supabase
        .from("shop_orders")
        .upsert(order, { onConflict: "salla_id", ignoreDuplicates: true })
        .select("id, status")
        .maybeSingle();
      if (error) throw error;
      if (row) {
        await supabase.from("shop_order_events").insert({ order_id: row.id, to_status: row.status, note: "من سلة / From Salla" });
        if (row.status === "new" && !order.branch) {
          await notifyManagers(`⚠️ طلب سلة بدون فرع / Salla order without branch: #${order.reference ?? order.salla_id} (${order.city ?? "?"})`);
        }
      }
    } else if (event === "order.status.updated" || event === "order.cancelled" || event === "order.updated") {
      const order = parseSallaOrder(data);
      const { data: current } = await supabase.from("shop_orders").select("id, status, reference").eq("salla_id", order.salla_id).maybeSingle();
      if (current) {
        const canceled = event === "order.cancelled" || isSallaCanceled(order.salla_status);
        const update = canceled && current.status !== "canceled" && current.status !== "delivered"
          ? { salla_status: order.salla_status, status: "canceled", updated_at: new Date().toISOString() }
          : { salla_status: order.salla_status, updated_at: new Date().toISOString() };
        const { error } = await supabase.from("shop_orders").update(update).eq("id", current.id);
        if (error) throw error;
        if ("status" in update) {
          await supabase.from("shop_order_events").insert({ order_id: current.id, from_status: current.status, to_status: "canceled", note: "إلغاء من سلة / Canceled in Salla" });
          await notifyManagers(`❌ طلب ملغي من سلة / Order canceled in Salla: #${current.reference ?? order.salla_id}`);
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error(`Salla webhook ${event} failed:`, message);
    if (log) await supabase.from("shop_salla_webhooks").update({ error: message }).eq("id", log.id);
  }

  // Always 200 once the payload is saved, so Salla doesn't keep retrying a parsing bug.
  return NextResponse.json({ ok: true });
}
