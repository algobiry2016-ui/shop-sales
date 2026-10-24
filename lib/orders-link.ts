// Server-only: sends a delivery sale to the orders system (website-orders, same Supabase
// project), with the seller's own login. That system builds the order from the saved sale,
// ready for the supervisor, and writes its id back on the sale; sending twice is harmless.
import { createClient } from "./supabase/server";

const ORDERS_URL = "https://website-orders-two.vercel.app";

/** Null when the order reached the supervisor, else the reason. */
export async function sendDelivery(saleId: number, photo?: unknown): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return "Unauthorized";
  try {
    const res = await fetch(`${ORDERS_URL}/api/shop/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sale_id: saleId, photo: typeof photo === "string" ? photo : undefined }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return null;
    return (await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`;
  } catch (err) {
    return err instanceof Error ? err.message : "Network error";
  }
}
