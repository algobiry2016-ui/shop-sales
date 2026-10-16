import { redirect } from "next/navigation";
import { homeOf, requireProfile } from "@/lib/supabase/server";

export default async function Home() {
  const profile = await requireProfile();
  redirect(homeOf(profile));
}
