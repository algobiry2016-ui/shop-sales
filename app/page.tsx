import Link from "next/link";
import { redirect } from "next/navigation";
import { Bi, SPACES } from "@/components/ui";
import { T } from "@/lib/labels";
import { homeOf, requireProfile } from "@/lib/supabase/server";

// Management picks a system; everyone else goes straight to theirs.
export default async function Home() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect(homeOf(profile));
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Logo" className="mx-auto h-24 w-auto" />
        <Link href="/orders" className="block rounded-md bg-ink p-6 text-center text-xl font-semibold text-white">
          <Bi l={SPACES.orders} display />
        </Link>
        <Link href="/reports/daily" className="block rounded-md border border-ink bg-white p-6 text-center text-xl font-semibold">
          <Bi l={SPACES.sales} display />
        </Link>
        <form action="/api/logout" method="post" className="text-center text-sm">
          <button className="text-muted underline">
            <Bi l={T.logout} />
          </button>
        </form>
      </div>
    </main>
  );
}
