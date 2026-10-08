import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client that bypasses Row Level Security, for scheduled jobs with no
 * signed-in user (the daily summary). Never import this from client components.
 * SUPABASE_SECRET_KEY lives only in Vercel, never in the repository.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}
