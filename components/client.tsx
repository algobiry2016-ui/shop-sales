"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { T, bi, type Bilingual } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { Bi } from "./bi";

/** Re-renders the page whenever a sale is added or deleted. */
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("sales-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_sales" }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-muted">
      <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
      {bi(T.live)}
    </span>
  );
}

export function DeleteSaleButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function onClick() {
    if (!confirm(bi(T.confirmDelete))) return;
    setBusy(true);
    await fetch(`/api/sales/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }
  return (
    <button onClick={onClick} disabled={busy} className="no-print rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
      <Bi l={T.delete} />
    </button>
  );
}

/** Date / month picker that navigates on change. */
export function PeriodPicker({ type, value }: { type: "date" | "month"; value: string }) {
  const router = useRouter();
  return (
    <input
      type={type}
      value={value}
      dir="ltr"
      onChange={(e) => e.target.value && router.push(`?${type}=${e.target.value}`)}
      className="rounded-sm border p-2"
    />
  );
}

export function NavLinks({ links }: { links: { href: string; label: Bilingual }[] }) {
  const pathname = usePathname();
  return (
    <nav className="order-last flex w-full gap-1 text-sm md:order-none md:w-auto">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex-1 rounded-sm px-3 py-1.5 text-center transition md:flex-none ${pathname.startsWith(l.href) ? "bg-ink text-white" : "hover:bg-sand"}`}
        >
          <Bi l={l.label} />
        </Link>
      ))}
    </nav>
  );
}

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="no-print rounded-sm border border-line px-3 py-2 text-sm transition hover:bg-sand">
      <Bi l={T.print} />
    </button>
  );
}
