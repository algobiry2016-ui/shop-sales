import { NextResponse } from "next/server";
import { ASSIGNABLE_ROLES, loginEmail, needsBranch, type Role } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";

const BRANCHES = ["riyadh", "khamis"];
const assignable = (r: unknown): r is Role => (ASSIGNABLE_ROLES as readonly unknown[]).includes(r);
// A long ban stops the login itself; "none" lifts it.
const STOPPED = "876000h";

async function guard() {
  const profile = await getProfile();
  if (profile?.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const db = createAdminClient();
  if (!db) return { error: NextResponse.json({ error: "SUPABASE_SECRET_KEY is not set in Vercel" }, { status: 500 }) };
  return { db, profile };
}

/** Adds a staff member: a login (mobile + password) and their place in shop_staff. */
export async function POST(request: Request) {
  const g = await guard();
  if (g.error) return g.error;
  const { db } = g;

  const body = await request.json().catch(() => null);
  const name = typeof body?.full_name === "string" ? body.full_name.trim().slice(0, 80) : "";
  const email = loginEmail(String(body?.mobile ?? ""));
  const password = String(body?.password ?? "");
  const role = body?.role;
  const branch = needsBranch(role) ? body?.branch : null;
  if (!name || !email || password.length < 6 || !assignable(role) || (needsBranch(role) && !BRANCHES.includes(branch))) {
    return NextResponse.json({ error: "تأكد من الاسم والجوال وكلمة المرور (6 أحرف على الأقل) والدور والفرع / Check the fields" }, { status: 400 });
  }

  // The number may already have a login (e.g. from another system or an earlier try).
  let userId: string | null = null;
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.data.user) userId = created.data.user.id;
  else {
    const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
    const existing = list?.users.find((u) => u.email === email);
    if (!existing) return NextResponse.json({ error: created.error?.message ?? "Error" }, { status: 400 });
    userId = existing.id;
    await db.auth.admin.updateUserById(userId, { password, ban_duration: "none" });
  }

  const { error } = await db.from("shop_staff").upsert({ id: userId, full_name: name, role, branch, active: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** Changes one staff member: stop / start, new password, role and branch. */
export async function PATCH(request: Request) {
  const g = await guard();
  if (g.error) return g.error;
  const { db, profile } = g;

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const { data: staff } = await db.from("shop_staff").select("id, role").eq("id", id).maybeSingle();
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Management accounts are managed in Supabase, not here (no locking yourself out).
  if (staff.role === "admin" || staff.id === profile.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (body?.action === "stop" || body?.action === "start") {
    const active = body.action === "start";
    const { error } = await db.auth.admin.updateUserById(id, { ban_duration: active ? "none" : STOPPED });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await db.from("shop_staff").update({ active }).eq("id", id);
  } else if (body?.action === "password") {
    const password = String(body?.password ?? "");
    if (password.length < 6) return NextResponse.json({ error: "6 أحرف على الأقل / At least 6 characters" }, { status: 400 });
    const { error } = await db.auth.admin.updateUserById(id, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (body?.action === "role") {
    const role = body?.role;
    const branch = needsBranch(role) ? body?.branch : null;
    if (!assignable(role) || (needsBranch(role) && !BRANCHES.includes(branch))) return NextResponse.json({ error: "Check role and branch" }, { status: 400 });
    const { error } = await db.from("shop_staff").update({ role, branch }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
