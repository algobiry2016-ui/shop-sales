import type { Metadata } from "next";
import { Nav } from "@/components/ui";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/supabase/server";

// Website orders: a system of its own, with its own header, links and home-screen app.
export const metadata: Metadata = {
  title: "طلبات الموقع / Website Orders",
  manifest: "/orders.webmanifest",
};

export default async function OrdersLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  // Shop coordinators work in shop sales only.
  if (profile.role === "employee") redirect("/sale");
  return (
    <>
      <Nav profile={profile} space="orders" />
      {children}
    </>
  );
}
