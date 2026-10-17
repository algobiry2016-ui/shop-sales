import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveOrders, OrderActions, PhotoUpload } from "@/components/order-actions";
import { StatusBadge, Tag, When } from "@/components/orders";
import { Bi, Card } from "@/components/ui";
import { BRANCHES, CHECKS, OL, ORDER_STATUS, PAYMENTS, allowedActions, checksFor, waLink, type Check, type OrderStatus } from "@/lib/orders";
import { loadOrder, photoUrl, staffOf } from "@/lib/orders-server";
import { money } from "@/lib/report";
import { localTime, localDate } from "@/lib/time";
import { requireProfile } from "@/lib/supabase/server";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  const { id } = await params;
  const found = await loadOrder(profile, Number(id));
  if (!found) notFound();
  const { order, events } = found;

  const actions = allowedActions(profile, order);
  const [photo, florists, reps] = await Promise.all([
    photoUrl(order.ready_photo),
    actions.includes("assign_florist") ? staffOf("florist", order.branch) : [],
    actions.includes("assign_rep") ? staffOf("rep", order.branch) : [],
  ]);
  const ref = `#${order.reference ?? order.salla_id}`;
  const seesMoney = profile.role === "admin" || profile.role === "site_manager" || profile.role === "supervisor";
  const qr = order.attachments.filter((a) => /باركود|QR/i.test(a.name));
  const otherFiles = order.attachments.filter((a) => !qr.includes(a));

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-3 sm:p-4">
      <LiveOrders />
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/orders" className="rounded-sm border border-line px-3 py-1.5 text-sm hover:bg-sand">
          <Bi l={OL.back} />
        </Link>
        <h1 className="text-2xl font-semibold" dir="ltr">
          {ref}
        </h1>
        <StatusBadge status={order.status} />
        {order.branch && <Tag>{BRANCHES[order.branch].ar}</Tag>}
        {order.pickup && <Tag>{OL.pickup.ar}</Tag>}
      </div>

      {order.note && (order.status === "with_florist" || order.status === "ready" || order.status === "canceled") && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">📝 {order.note}</p>
      )}

      {/* What to do now */}
      {actions.length > 0 && (
        <Card className="space-y-3">
          {actions.includes("ready") && <PhotoUpload orderId={order.id} />}
          <OrderActions
            orderId={order.id}
            actions={actions}
            checks={checksFor(order)}
            florists={florists}
            reps={reps}
            needsReviewChecks={order.status === "ready"}
            pickupPhone={order.customer_phone}
            reference={ref}
          />
        </Card>
      )}

      {/* The card message comes first: it is the easiest thing to get wrong. */}
      <Card className="space-y-2 border-ink">
        <Bi l={OL.card} className="text-sm font-medium" />
        {order.card_message ? (
          <p className="whitespace-pre-wrap text-xl leading-relaxed">{order.card_message}</p>
        ) : (
          <p className="text-muted">
            <Bi l={OL.noCard} />
          </p>
        )}
        {(qr.length > 0 || otherFiles.length > 0) && (
          <div className="space-y-1 border-t border-line pt-2 text-sm">
            <Bi l={OL.attachments} className="font-medium" />
            {[...qr, ...otherFiles].map((a, i) => (
              <p key={i}>
                {a.name}:{" "}
                {/^https?:\/\//.test(a.value) ? (
                  <a href={a.value} target="_blank" rel="noreferrer" className="break-all underline" dir="ltr">
                    {a.value}
                  </a>
                ) : (
                  a.value
                )}
              </p>
            ))}
          </div>
        )}
      </Card>

      <Card className="grid gap-4 sm:grid-cols-2">
        <Field l={order.pickup ? OL.pickup : OL.delivery}>
          <When order={order} />
        </Field>
        <Field l={OL.area}>{[order.delivery_area, order.address !== order.delivery_area && order.address].filter(Boolean).join(" — ") || "—"}</Field>
        <Field l={OL.recipient}>
          <Phone phone={order.recipient_phone} name={order.recipient_name} />
        </Field>
        <Field l={OL.sender}>
          {order.anonymous ? (
            <span className="font-medium text-red-700">
              <Bi l={OL.anonymous} />
            </span>
          ) : (
            <Phone phone={order.customer_phone} name={order.customer_name} />
          )}
        </Field>
        {order.florist && <Field l={OL.florist}>{order.florist.full_name}</Field>}
        {order.rep && <Field l={OL.rep}>{order.rep.full_name}</Field>}
        {order.tracking_number && (
          <Field l={OL.tracking}>
            <span dir="ltr">{order.tracking_number}</span>
          </Field>
        )}
      </Card>

      <Card className="space-y-3">
        <Bi l={OL.items} className="font-medium" />
        <div className="grid gap-3 sm:grid-cols-2">
          {order.items.map((i, n) => (
            <div key={n} className="flex items-center gap-3">
              {i.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.image} alt="" className="h-20 w-20 rounded-sm object-cover" />
              )}
              <span>
                {i.name} {i.quantity > 1 && <b>×{i.quantity}</b>}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {photo && (
        <Card className="space-y-2">
          <Bi l={OL.readyPhoto} className="font-medium" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="max-h-[70vh] w-full rounded-sm object-contain" />
        </Card>
      )}

      {seesMoney && (
        <Card className="grid grid-cols-3 gap-3 text-center">
          <Field l={OL.total}>
            <b dir="ltr">{order.total != null ? money(order.total) : "—"}</b>
          </Field>
          <Field l={OL.deliveryFee}>
            <span dir="ltr">{order.delivery_fee != null ? money(order.delivery_fee) : "—"}</span>
          </Field>
          <Field l={OL.payment}>{order.payment_method ? (PAYMENTS[order.payment_method]?.ar ?? order.payment_method) : "—"}</Field>
        </Card>
      )}

      <Card className="space-y-2">
        <Bi l={OL.history} className="font-medium" />
        <ol className="space-y-2 text-sm">
          {events.map((e) => (
            <li key={e.id} className="border-s-2 border-line ps-3">
              <span className="text-muted" dir="ltr">
                {localDate(e.at) === localDate() ? "" : `${localDate(e.at)} `}
                {localTime(e.at)}
              </span>{" "}
              — {ORDER_STATUS[e.to_status as OrderStatus]?.ar ?? e.to_status}
              {e.actor && <span className="text-muted"> · {e.actor.full_name}</span>}
              {e.note && <p className="text-muted">{e.note}</p>}
              {e.checks && (
                <p className="text-xs text-green-700">
                  ✓ {Object.keys(e.checks).map((c) => CHECKS[c as Check]?.ar).filter(Boolean).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ol>
      </Card>
    </main>
  );
}

function Field({ l, children }: { l: { ar: string; en: string }; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Bi l={l} className="text-xs text-muted" />
      <div>{children}</div>
    </div>
  );
}

function Phone({ phone, name }: { phone: string | null; name: string | null }) {
  if (!phone) return <span>{name ?? "—"}</span>;
  const wa = waLink(phone, "");
  return (
    <span className="flex flex-wrap items-center gap-2">
      {name && <span>{name}</span>}
      <a href={`tel:${phone}`} className="font-medium underline" dir="ltr">
        {phone}
      </a>
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className="rounded-sm border border-line px-2 py-0.5 text-xs hover:bg-sand">
          {OL.whatsapp.ar}
        </a>
      )}
    </span>
  );
}

