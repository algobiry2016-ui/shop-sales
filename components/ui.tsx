import Link from "next/link";
import type { Bilingual } from "@/lib/labels";
import { T } from "@/lib/labels";
import type { Profile } from "@/lib/supabase/server";

/** Arabic on top, English underneath. `display` sets the English in the brand serif. */
export function Bi({ l, className = "", display = false }: { l: Bilingual; className?: string; display?: boolean }) {
  return (
    <span className={`inline-flex flex-col leading-tight ${className}`}>
      <span>{l.ar}</span>
      <span className={display ? "mt-0.5 font-display text-[0.6em] font-normal uppercase tracking-[0.2em] opacity-70" : "text-[0.75em] font-normal opacity-60"} dir="ltr">
        {l.en}
      </span>
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-md border border-line bg-white p-4 sm:p-5 ${className}`}>{children}</section>;
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
    <header className="sticky top-0 z-10 border-b border-line bg-white text-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
        <span className="me-auto flex items-center gap-3 text-base font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="Logo" className="h-11 w-11" />
          <Bi l={T.appName} display />
        </span>
        <nav className="order-last flex w-full gap-1 text-sm md:order-none md:w-auto">
          {links.map((l) => (
            <Link key={l.key} href={l.href} className={`flex-1 rounded-sm px-3 py-1.5 text-center transition md:flex-none ${active === l.key ? "bg-ink text-white" : "hover:bg-sand"}`}>
              <Bi l={l.label} />
            </Link>
          ))}
        </nav>
        <form action="/api/logout" method="post" className="flex items-center gap-2 text-sm">
          <span className="hidden text-muted sm:inline">{profile.full_name}</span>
          <button className="rounded-sm border border-line px-3 py-1.5 transition hover:bg-sand">
            <Bi l={T.logout} />
          </button>
        </form>
      </div>
    </header>
  );
}
