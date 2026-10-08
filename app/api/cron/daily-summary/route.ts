import { NextResponse, type NextRequest } from "next/server";
import { formatDailySummary, notifyManagers } from "@/lib/notify";
import { SALE_COLUMNS, summarize, type Sale } from "@/lib/report";
import { createAdminClient } from "@/lib/supabase/admin";
import { dayRange, localDate } from "@/lib/time";

// Runs every night from vercel.json and sends today's summary to the managers on Telegram.
export async function GET(request: NextRequest) {
  // Vercel sends this header when CRON_SECRET is set; it stops anyone else triggering the job.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_SECRET_KEY is not set in Vercel" }, { status: 500 });

  const date = localDate();
  const [start, end] = dayRange(date);
  const { data, error } = await supabase.from("shop_sales").select(SALE_COLUMNS).gte("created_at", start).lt("created_at", end);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notifyManagers(formatDailySummary(date, summarize((data ?? []) as unknown as Sale[])));
  return NextResponse.json({ ok: true, date, count: data?.length ?? 0 });
}
