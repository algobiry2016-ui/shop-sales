// Server-only: uses the secret key for reps and photos. Never import from client components.
import { ORDER_COLUMNS, PHOTO_BUCKET, forRep, type Order, type OrderEvent, type OrderStatus } from "./orders";
import { createAdminClient } from "./supabase/admin";
import { createClient, type Profile } from "./supabase/server";

const ACTIVE: OrderStatus[] = ["scheduled", "new", "with_florist", "ready", "awaiting_pickup", "with_rep", "with_barq", "out_for_delivery"];

/**
 * The orders this person works on. Managers, supervisors and florists read through Row
 * Level Security; reps read through the server so an anonymous sender is stripped first.
 */
export async function loadOrders(p: Profile, opts: { done?: boolean; branch?: string } = {}): Promise<Order[]> {
  if (p.role === "rep") {
    const db = createAdminClient();
    if (!db) return [];
    const { data } = await db.from("shop_orders").select(ORDER_COLUMNS).eq("rep_id", p.id).in("status", ["with_rep", "out_for_delivery"]).order("delivery_date");
    return ((data ?? []) as unknown as Order[]).map(forRep);
  }
  const supabase = await createClient();
  let q = supabase.from("shop_orders").select(ORDER_COLUMNS);
  if (opts.done) {
    // Finished in the last 24 hours.
    q = q.in("status", ["delivered", "canceled"]).gte("updated_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  } else {
    q = q.in("status", p.role === "florist" ? ["with_florist"] : ACTIVE);
  }
  if (p.role === "admin" && opts.branch) q = opts.branch === "none" ? q.is("branch", null) : q.eq("branch", opts.branch);
  const { data } = await q.order("delivery_date", { ascending: true, nullsFirst: true }).order("created_at");
  return (data ?? []) as unknown as Order[];
}

export async function loadOrder(p: Profile, id: number): Promise<{ order: Order; events: OrderEvent[] } | null> {
  const db = p.role === "rep" ? createAdminClient() : await createClient();
  if (!db) return null;
  const { data } = await db.from("shop_orders").select(ORDER_COLUMNS).eq("id", id).maybeSingle();
  let order = data as unknown as Order | null;
  if (!order) return null;
  if (p.role === "rep") {
    if (order.rep_id !== p.id) return null;
    order = forRep(order);
  }
  const { data: events } = await db
    .from("shop_order_events")
    .select("id, at, from_status, to_status, note, checks, actor:shop_staff(full_name)")
    .eq("order_id", id)
    .order("at");
  return { order, events: (events ?? []) as unknown as OrderEvent[] };
}

/** A one-hour link to a finished-order photo. */
export async function photoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const db = createAdminClient();
  const { data } = (await db?.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600)) ?? { data: null };
  return data?.signedUrl ?? null;
}

/** Active florists or reps of a branch, for the assign pickers. */
export async function staffOf(role: "florist" | "rep", branch: string | null): Promise<{ id: string; full_name: string }[]> {
  const db = createAdminClient();
  if (!db) return [];
  let q = db.from("shop_staff").select("id, full_name").eq("role", role).eq("active", true);
  if (branch) q = q.eq("branch", branch);
  const { data } = await q.order("full_name");
  return data ?? [];
}
