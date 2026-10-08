"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { T, bi } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { Bi } from "./ui";

/** Re-renders the page whenever a sale is added or deleted. */
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("sales-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => router.refresh())
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
    <button onClick={onClick} disabled={busy} className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
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
