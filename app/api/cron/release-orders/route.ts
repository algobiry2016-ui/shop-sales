import { NextResponse, type NextRequest } from "next/server";
import { notifyManagers } from "@/lib/notify";
import { releaseDate } from "@/lib/salla";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDate } from "@/lib/time";

// Runs daily at 1 PM Riyadh (florists' shift start) from vercel.json: scheduled orders
// due for preparation become "new" for the website manager of their branch.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SECRET_KEY is not set in Vercel" }, { status: 500 });

  const today = localDate();
  const { data, error } = await supabase.from("shop_orders").select("id, reference, salla_id, branch, delivery_date, delivery_slot").eq("status", "scheduled");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const due = (data ?? []).filter((o) => !o.delivery_date || releaseDate(o.delivery_date, o.delivery_slot) <= today);
  for (const o of due) {
    // Only moves it if nothing else (a cancel) changed it meanwhile.
    const { data: moved } = await supabase.from("shop_orders").update({ status: "new", updated_at: new Date().toISOString() }).eq("id", o.id).eq("status", "scheduled").select("id");
    if (moved?.length) await supabase.from("shop_order_events").insert({ order_id: o.id, from_status: "scheduled", to_status: "new", note: "موعد التجهيز / Due for preparation" });
  }

  if (due.length) {
    const count = (b: string | null) => due.filter((o) => o.branch === b).length;
    await notifyManagers(
      [`📦 طلبات مجدولة وصل وقت تجهيزها / Scheduled orders due: ${due.length}`, `الرياض / Riyadh: ${count("riyadh")}`, `خميس مشيط / Khamis: ${count("khamis")}`]
        .concat(count(null) ? [`بدون فرع / No branch: ${count(null)}`] : [])
        .join("\n"),
    );
  }
  return NextResponse.json({ ok: true, released: due.length });
}
