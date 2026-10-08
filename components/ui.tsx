import { T } from "@/lib/labels";
import type { Profile } from "@/lib/supabase/server";
import { Bi } from "./bi";
import { NavLinks } from "./client";

export { Bi };

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-md border border-line bg-white p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function Nav({ profile }: { profile: Profile }) {
  const links = [
    { href: "/sale", label: T.newSale },
    ...(profile.role === "admin"
      ? [
          { href: "/reports/daily", label: T.dailyReport },
          { href: "/reports/monthly", label: T.monthlyReport },
        ]
      : []),
  ];
  return (
    <header className="no-print sticky top-0 z-10 border-b border-line bg-white text-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
        <span className="me-auto flex items-center gap-3 text-base font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="Logo" className="h-11 w-11" />
          <Bi l={T.appName} display />
        </span>
        <NavLinks links={links} />
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
