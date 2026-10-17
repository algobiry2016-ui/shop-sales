import Link from "next/link";
import { LiveOrders } from "@/components/order-actions";
import { OrderCard } from "@/components/orders";
import { Bi, Card } from "@/components/ui";
import { BOARD, BRANCHES, OL, ORDER_STATUS, type Order, type OrderStatus } from "@/lib/orders";
import { loadOrders } from "@/lib/orders-server";
import { requireProfile } from "@/lib/supabase/server";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ branch?: string; done?: string }> }) {
  const profile = await requireProfile();
  const { branch, done } = await searchParams;
  const orders = await loadOrders(profile, { branch, done: done === "1" });
  const isBoard = profile.role === "admin" || profile.role === "site_manager" || profile.role === "supervisor";

  // Florists and reps: one list of their own orders, soonest first.
  if (!isBoard) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-3 sm:p-4">
        <LiveOrders />
        <h1 className="text-xl font-semibold">
          <Bi l={OL.myOrders} />
        </h1>
        {orders.length ? orders.map((o) => <OrderCard key={o.id} order={o} />) : <Empty />}
      </main>
    );
  }

  const groups = (done === "1" ? (["delivered", "canceled"] as OrderStatus[]) : BOARD).map((s) => [s, orders.filter((o) => o.status === s)] as const);
  const params = (p: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ branch, done, ...p }).filter(([, v]) => v) as [string, string][]);
    return q.size ? `?${q}` : "?";
  };

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-3 sm:p-4">
      <LiveOrders />
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="me-auto text-xl font-semibold">
          <Bi l={OL.orders} />
        </h1>
        {profile.role === "admin" && (
          <nav className="flex flex-wrap gap-1 text-sm">
            <Pill href={params({ branch: undefined })} on={!branch} l={OL.all} />
            {Object.entries(BRANCHES).map(([k, l]) => (
              <Pill key={k} href={params({ branch: k })} on={branch === k} l={l} />
            ))}
            <Pill href={params({ branch: "none" })} on={branch === "none"} l={OL.noBranch} />
          </nav>
        )}
        <nav className="flex gap-1 text-sm">
          <Pill href={params({ done: undefined })} on={done !== "1"} l={OL.active} />
          <Pill href={params({ done: "1" })} on={done === "1"} l={OL.doneToday} />
        </nav>
      </div>

      {orders.length === 0 && <Empty />}
      <div className="grid gap-4 lg:grid-cols-2">
        {groups
          .filter(([, list]) => list.length)
          .map(([status, list]) => (
            <Card key={status} className="space-y-2 !p-3">
              <h2 className="flex items-center justify-between font-semibold">
                <Bi l={ORDER_STATUS[status]} />
                <span className="rounded-full bg-ink px-2.5 py-0.5 text-sm text-white">{list.length}</span>
              </h2>
              {list.map((o: Order) => (
                <OrderCard key={o.id} order={o} showBranch={profile.role === "admin" && !branch} />
              ))}
            </Card>
          ))}
      </div>
    </main>
  );
}

function Pill({ href, on, l }: { href: string; on: boolean; l: { ar: string; en: string } }) {
  return (
    <Link href={href} className={`rounded-sm px-3 py-1.5 ${on ? "bg-ink text-white" : "border border-line hover:bg-sand"}`}>
      <Bi l={l} />
    </Link>
  );
}

function Empty() {
  return (
    <p className="rounded-md border border-line bg-white p-6 text-center text-muted">
      <Bi l={OL.noOrders} />
    </p>
  );
}
