import Link from "next/link";
import { BRANCHES, OL, ORDER_STATUS, SLOTS, type Order, type OrderStatus } from "@/lib/orders";
import { weekday } from "@/lib/time";
import { Bi } from "./bi";

const TONE: Record<OrderStatus, string> = {
  scheduled: "bg-stone/60",
  new: "bg-amber-100 text-amber-900",
  with_florist: "bg-sky-100 text-sky-900",
  ready: "bg-violet-100 text-violet-900",
  awaiting_pickup: "bg-orange-100 text-orange-900",
  with_rep: "bg-teal-100 text-teal-900",
  with_barq: "bg-teal-100 text-teal-900",
  out_for_delivery: "bg-emerald-100 text-emerald-900",
  delivered: "bg-green-700 text-white",
  canceled: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${TONE[status]}`}>
      <Bi l={ORDER_STATUS[status]} />
    </span>
  );
}

/** "الخميس 2026-10-17 · 7 – 11 مساءً" */
export function When({ order }: { order: Order }) {
  if (!order.delivery_date) return <span className="text-muted">—</span>;
  return (
    <span>
      {weekday(order.delivery_date).ar} <span dir="ltr">{order.delivery_date}</span>
      {order.delivery_slot && <span className="text-muted"> · {SLOTS[order.delivery_slot].ar}</span>}
    </span>
  );
}

/** Compact order card for the boards; the whole card opens the order. */
export function OrderCard({ order, showBranch }: { order: Order; showBranch?: boolean }) {
  const items = order.items.map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name)).filter(Boolean);
  return (
    <Link href={`/orders/${order.id}`} className="block rounded-md border border-line bg-white p-3 transition hover:border-ink">
      <div className="flex items-start gap-3">
        {order.items[0]?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={order.items[0].image} alt="" className="h-16 w-16 shrink-0 rounded-sm object-cover" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold" dir="ltr">
              #{order.reference ?? order.salla_id}
            </span>
            <StatusBadge status={order.status} />
            {order.pickup && <Tag>{OL.pickup.ar}</Tag>}
            {order.anonymous && <Tag>مجهول</Tag>}
            {showBranch && <Tag>{order.branch ? BRANCHES[order.branch].ar : OL.noBranch.ar}</Tag>}
          </div>
          <p className="text-sm">
            <When order={order} />
          </p>
          <p className="truncate text-sm text-muted">{items.join("، ")}</p>
          <p className="truncate text-xs text-muted">
            {[order.delivery_area ?? order.address, order.florist?.full_name && `🌸 ${order.florist.full_name}`, order.rep?.full_name && `🚚 ${order.rep.full_name}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-line px-2 py-0.5 text-xs">{children}</span>;
}
