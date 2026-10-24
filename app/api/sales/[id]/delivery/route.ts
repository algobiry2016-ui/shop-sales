import { NextResponse } from "next/server";
import { sendDelivery } from "@/lib/orders-link";
import { getProfile } from "@/lib/supabase/server";

// "إعادة الإرسال": a delivery sale that didn't reach the supervisor (no connection) is sent
// again. The orders system checks it is the seller's (or a manager's) and never doubles it.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getProfile())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const error = await sendDelivery(Number(id));
  return error ? NextResponse.json({ error }, { status: 400 }) : NextResponse.json({ ok: true });
}
