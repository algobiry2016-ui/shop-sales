import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/supabase/server";

export default async function Home() {
  const profile = await requireProfile();
  redirect(profile.role === "admin" ? "/reports/daily" : "/sale");
}
