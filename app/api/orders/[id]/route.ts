import { after, NextResponse } from "next/server";
import { notifyChat, notifyManagers } from "@/lib/notify";
import { ACTIONS, BRANCHES, allowedActions, checksFor, type Action, type Check, type Order, type OrderStatus } from "@/lib/orders";
import { SALLA_STATUS, setSallaStatus } from "@/lib/salla";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";

const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/**
 * One step of the order cycle. Every change to an order goes through here: the step is
 * checked against allowedActions (role, branch, assignee, current status), written with
 * the server key, logged in shop_order_events, mirrored to Salla where the store uses a
 * status, and the next person is alerted on Telegram.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: "SUPABASE_SECRET_KEY is not set in Vercel" }, { status: 500 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const action = body?.action as Action;
  if (!(action in ACTIONS)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const { data: order } = await db.from("shop_orders").select("*").eq("id", Number(id)).maybeSingle<Order>();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!allowedActions(profile, order).includes(action)) {
    return NextResponse.json({ error: "هذي الخطوة مو متاحة لك الآن / Not allowed now" }, { status: 403 });
  }

  const note = clean(body?.note, 500);
  const staffOf = async (staffId: unknown, role: string) => {
    if (typeof staffId !== "string") return null;
    const { data } = await db.from("shop_staff").select("id, full_name, role, branch, telegram_chat_id, active").eq("id", staffId).maybeSingle();
    return data && data.role === role && data.active && (profile.role === "admin" || data.branch === order.branch) ? data : null;
  };
  const checklist = () => {
    const needed = checksFor(order);
    const given = (body?.checks ?? {}) as Partial<Record<Check, boolean>>;
    return needed.every((c) => given[c] === true) ? Object.fromEntries(needed.map((c) => [c, true])) : null;
  };

  let to: OrderStatus = order.status;
  const update: Record<string, unknown> = {};
  let checks: Record<string, boolean> | null = null;
  let sallaStatus: number | null = null;
  let alert: { chat: string | null; text: string } | null = null;
  const ref = `#${order.reference ?? order.salla_id}`;

  switch (action) {
    case "release":
      to = "new";
      break;
    case "set_branch":
      if (!(body?.branch in BRANCHES)) return bad("اختر الفرع / Pick a branch");
      update.branch = body.branch;
      break;
    case "assign_florist": {
      const florist = await staffOf(body?.florist_id, "florist");
      if (!florist) return bad("اختر المنسق / Pick a florist");
      to = "with_florist";
      update.florist_id = florist.id;
      if (order.status === "new") sallaStatus = SALLA_STATUS.in_progress;
      alert = { chat: florist.telegram_chat_id, text: `🌸 طلب جديد لك / New order for you: ${ref}` };
      break;
    }
    case "ready":
      if (!order.ready_photo) return bad("ارفع صورة الطلب الجاهز أولًا / Upload the photo first");
      to = "ready";
      alert = { chat: null, text: `✅ طلب جاهز للمراجعة / Ready for review: ${ref}` };
      break;
    case "return_to_florist":
      if (!note) return bad("اكتب وش المطلوب تعديله / Write what to fix");
      to = "with_florist";
      update.ready_photo = null;
      update.note = note;
      {
        const { data: f } = await db.from("shop_staff").select("telegram_chat_id").eq("id", order.florist_id ?? "").maybeSingle();
        alert = { chat: f?.telegram_chat_id ?? null, text: `↩️ رجع لك الطلب / Order returned: ${ref}\n${note}` };
      }
      break;
    case "assign_rep": {
      const rep = await staffOf(body?.rep_id, "rep");
      if (!rep) return bad("اختر المندوب / Pick a rep");
      if (order.status === "ready" && !(checks = checklist())) return bad("أكّد قائمة المراجعة / Confirm the checklist");
      to = "with_rep";
      update.rep_id = rep.id;
      update.tracking_number = null;
      alert = { chat: rep.telegram_chat_id, text: `🚚 طلب لك للتوصيل / Delivery for you: ${ref}` };
      break;
    }
    case "assign_barq": {
      const tracking = clean(body?.tracking_number, 60);
      if (!tracking) return bad("اكتب رقم شحنة برق / Barq tracking number");
      if (!(checks = checklist())) return bad("أكّد قائمة المراجعة / Confirm the checklist");
      to = "with_barq";
      update.tracking_number = tracking;
      update.rep_id = null;
      break;
    }
    case "notify_pickup":
      if (!(checks = checklist())) return bad("أكّد قائمة المراجعة / Confirm the checklist");
      to = "awaiting_pickup";
      break;
    case "out_for_delivery":
      if (!(checks = checklist())) return bad("أكّد قائمة المراجعة / Confirm the checklist");
      to = "out_for_delivery";
      break;
    case "picked_up":
    case "delivered":
      to = "delivered";
      sallaStatus = SALLA_STATUS.shipped;
      break;
    case "failed":
      if (!note) return bad("اكتب السبب / Write the reason");
      // Back to the supervisor; the order waits in the fridge for another rep.
      to = "ready";
      update.rep_id = null;
      update.note = note;
      alert = { chat: null, text: `⚠️ تعذّر التسليم / Delivery failed: ${ref}\n${note}` };
      break;
    case "cancel":
      if (!note) return bad("اكتب سبب الإلغاء / Write the reason");
      to = "canceled";
      update.note = note;
      break;
  }

  const now = new Date().toISOString();
  const { data: moved, error } = await db
    .from("shop_orders")
    .update({ ...update, status: to, updated_at: now })
    .eq("id", order.id)
    .eq("status", order.status) // someone else moved it meanwhile → nothing happens
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!moved?.length) return bad("الطلب تغيّر قبل شوي، حدّث الصفحة / The order just changed, refresh");

  await db.from("shop_order_events").insert({
    order_id: order.id,
    actor_id: profile.id,
    from_status: order.status,
    to_status: to,
    note: [ACTIONS[action].ar, note].filter(Boolean).join(" — "),
    checks,
  });

  after(async () => {
    if (sallaStatus) {
      const err = await setSallaStatus(db, order.salla_id, sallaStatus);
      if (err) await notifyManagers(`⚠️ ما تحدّثت حالة سلة / Salla status not updated: ${ref}\n${err}`);
    }
    if (alert?.chat) await notifyChat(alert.chat, alert.text);
    else if (alert) {
      // Ready / failed go to the branch supervisors.
      const { data: sups } = await db.from("shop_staff").select("telegram_chat_id").eq("role", "supervisor").eq("branch", order.branch ?? "").eq("active", true);
      await Promise.all((sups ?? []).map((s) => notifyChat(s.telegram_chat_id, alert.text)));
    }
  });

  return NextResponse.json({ ok: true, status: to });
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
