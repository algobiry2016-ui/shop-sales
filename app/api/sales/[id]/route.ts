import { NextResponse } from "next/server";
import { createClient, getProfile } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();
  // A delivery already with the supervisor: cancel its order there first, so no rep goes out
  // for a deleted sale. Managers here are managers there too, so they can read its status.
  const { data: sale } = await supabase.from("shop_sales").select("ord_order_id").eq("id", Number(id)).maybeSingle();
  if (sale?.ord_order_id) {
    const { data: order } = await supabase.from("ord_orders").select("status").eq("id", sale.ord_order_id).maybeSingle();
    if (order && order.status !== "canceled") return NextResponse.json({ error: "هذي العملية لها طلب توصيل عند المشرف: ألغه من برنامج الطلبات أول / Cancel its delivery order first" }, { status: 400 });
  }
  const { error } = await supabase.from("shop_sales").delete().eq("id", Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
