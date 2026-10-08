import Link from "next/link";
import type { Bilingual } from "@/lib/labels";
import { T } from "@/lib/labels";
import type { Profile } from "@/lib/supabase/server";

/** Arabic on top, English underneath. */
export function Bi({ l, className = "" }: { l: Bilingual; className?: string }) {
  return (
    <span className={`inline-flex flex-col leading-tight ${className}`}>
      <span>{l.ar}</span>
      <span className="text-[0.75em] font-normal opacity-70" dir="ltr">
        {l.en}
      </span>
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</section>;
}

export function Nav({ profile, active }: { profile: Profile; active: "sale" | "daily" | "monthly" }) {
  const links = [
    { key: "sale", href: "/sale", label: T.newSale },
    ...(profile.role === "admin"
      ? [
          { key: "daily", href: "/reports/daily", label: T.dailyReport },
          { key: "monthly", href: "/reports/monthly", label: T.monthlyReport },
        ]
      : []),
  ];
  return (
    <header className="sticky top-0 z-10 bg-pink-700 text-white shadow">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-2">
        <span className="me-auto text-lg font-bold">
          🌸 <Bi l={T.appName} />
        </span>
        <nav className="flex flex-wrap gap-1 text-sm">
          {links.map((l) => (
            <Link key={l.key} href={l.href} className={`rounded-lg px-3 py-1 ${active === l.key ? "bg-white text-pink-700" : "hover:bg-pink-600"}`}>
              <Bi l={l.label} />
            </Link>
          ))}
        </nav>
        <form action="/api/logout" method="post" className="flex items-center gap-2 text-sm">
          <span className="opacity-90">{profile.full_name}</span>
          <button className="rounded-lg bg-pink-900/40 px-3 py-1 hover:bg-pink-900/60">
            <Bi l={T.logout} />
          </button>
        </form>
      </div>
    </header>
  );
}
