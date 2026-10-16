import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PHOTO_BUCKET } from "@/lib/orders";
import { getProfile } from "@/lib/supabase/server";


// The florist's photo of the finished order. The phone shrinks it before upload, so it
// stays small; it is kept in a private bucket and shown through short-lived links.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: "SUPABASE_SECRET_KEY is not set in Vercel" }, { status: 500 });

  const { id } = await params;
  const { data: order } = await db.from("shop_orders").select("id, status, florist_id").eq("id", Number(id)).maybeSingle();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "with_florist" || (order.florist_id !== profile.id && profile.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "صورة غير صالحة / Invalid photo" }, { status: 400 });
  }

  const path = `${order.id}/${Date.now()}.jpg`;
  const { error } = await db.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await db.from("shop_orders").update({ ready_photo: path, updated_at: new Date().toISOString() }).eq("id", order.id);
  return NextResponse.json({ ok: true });
}
