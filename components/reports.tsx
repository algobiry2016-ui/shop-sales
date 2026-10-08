import { FULFILLMENT, ORDER_TYPES, PAYMENT_METHODS, T, type Bilingual } from "@/lib/labels";
import { money, type Sale, type Totals } from "@/lib/report";
import { localTime } from "@/lib/time";
import { DeleteSaleButton } from "./client";
import { Bi } from "./ui";

export function TotalsRow({ totals }: { totals: Totals }) {
  const items: { label: Bilingual; value: string; color: string }[] = [
    { label: T.total, value: money(totals.total), color: "bg-ink text-white" },
    { label: PAYMENT_METHODS.cash, value: money(totals.cash), color: "bg-sand text-ink" },
    { label: PAYMENT_METHODS.card, value: money(totals.card), color: "bg-stone text-ink" },
    { label: T.count, value: String(totals.count), color: "border border-line bg-white text-ink" },
  ];
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label.en} className={`rounded-md p-4 ${i.color}`}>
          <Bi l={i.label} className="text-sm" />
          <div className="mt-2 text-2xl font-semibold tracking-tight" dir="ltr">
            {i.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Totals grouped by some key (employee, order type, day…). */
export function Breakdown({ title, rows, labelOf }: { title: Bilingual; rows: Map<string, Totals>; labelOf?: (k: string) => React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-semibold">
        <Bi l={title} />
      </h3>
      {rows.size === 0 ? (
        <p className="text-muted">
          <Bi l={T.noSales} />
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="p-2 text-start" />
                <th className="p-2 text-start"><Bi l={T.count} /></th>
                <th className="p-2 text-start"><Bi l={PAYMENT_METHODS.cash} /></th>
                <th className="p-2 text-start"><Bi l={PAYMENT_METHODS.card} /></th>
                <th className="p-2 text-start"><Bi l={T.total} /></th>
              </tr>
            </thead>
            <tbody>
              {[...rows].map(([k, t]) => (
                <tr key={k} className="border-t border-line">
                  <td className="p-2 font-semibold">{labelOf ? labelOf(k) : k}</td>
                  <td className="p-2" dir="ltr">{t.count}</td>
                  <td className="p-2" dir="ltr">{money(t.cash)}</td>
                  <td className="p-2" dir="ltr">{money(t.card)}</td>
                  <td className="p-2 font-bold" dir="ltr">{money(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SalesTable({ sales, showEmployee = false, canDelete = false }: { sales: Sale[]; showEmployee?: boolean; canDelete?: boolean }) {
  if (sales.length === 0)
    return (
      <p className="text-muted">
        <Bi l={T.noSales} />
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full whitespace-nowrap text-sm">
        <thead className="border-b border-line text-muted">
          <tr>
            <th className="p-2 text-start"><Bi l={T.time} /></th>
            {showEmployee && <th className="p-2 text-start"><Bi l={T.employee} /></th>}
            <th className="p-2 text-start"><Bi l={T.orderType} /></th>
            <th className="p-2 text-start"><Bi l={T.fulfillment} /></th>
            <th className="p-2 text-start"><Bi l={T.paymentMethod} /></th>
            <th className="p-2 text-start"><Bi l={T.amount} /></th>
            {canDelete && <th />}
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id} className="border-t border-line align-top">
              <td className="p-2" dir="ltr">{localTime(s.created_at)}</td>
              {showEmployee && <td className="p-2 font-semibold">{s.profiles?.full_name}</td>}
              <td className="p-2">
                <Bi l={ORDER_TYPES[s.order_type]} />
                {(s.customer_name || s.notes) && (
                  <div className="mt-1 max-w-56 whitespace-normal text-xs text-muted">{[s.customer_name, s.customer_phone, s.notes].filter(Boolean).join(" · ")}</div>
                )}
              </td>
              <td className="p-2"><Bi l={FULFILLMENT[s.fulfillment]} /></td>
              <td className="p-2">
                <span className={`inline-block rounded-sm px-2 py-0.5 ${s.payment_method === "cash" ? "bg-sand" : "bg-stone"}`}>
                  <Bi l={PAYMENT_METHODS[s.payment_method]} />
                </span>
              </td>
              <td className="p-2 font-bold" dir="ltr">{money(Number(s.amount))}</td>
              {canDelete && (
                <td className="p-2">
                  <DeleteSaleButton id={s.id} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
