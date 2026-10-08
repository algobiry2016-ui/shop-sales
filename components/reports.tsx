import Link from "next/link";
import { FULFILLMENT, ORDER_TYPES, PAYMENT_METHODS, T, type Bilingual } from "@/lib/labels";
import { money, type Sale, type Totals } from "@/lib/report";
import { localTime, weekday } from "@/lib/time";
import { DeleteSaleButton } from "./client";
import { Bi } from "./bi";

export function TotalsRow({ totals }: { totals: Totals }) {
  const items: { label: Bilingual; value: string; sub?: string; color: string }[] = [
    { label: T.total, value: money(totals.total), color: "bg-ink text-white col-span-2 sm:col-span-1" },
    { label: PAYMENT_METHODS.cash, value: money(totals.cash), color: "bg-sand text-ink" },
    { label: PAYMENT_METHODS.card, value: money(totals.card), color: "bg-stone text-ink" },
    { label: T.count, value: String(totals.count), color: "border border-line bg-white text-ink" },
    { label: T.gifts, value: money(totals.gifts), sub: `× ${totals.giftCount}`, color: "border border-line bg-white text-ink" },
  ];
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((i) => (
        <div key={i.label.en} className={`rounded-md p-4 ${i.color}`}>
          <Bi l={i.label} className="text-sm" />
          <div className="mt-2 flex items-baseline gap-2 text-2xl font-semibold tracking-tight" dir="ltr">
            {i.value}
            {i.sub && <span className="text-sm font-normal opacity-60">{i.sub}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

const NoSales = () => (
  <p className="text-muted">
    <Bi l={T.noSales} />
  </p>
);

/** Totals grouped by some key (employee, order type, day…). */
export function Breakdown({ title, rows, labelOf }: { title: Bilingual; rows: Map<string, Totals>; labelOf?: (k: string) => React.ReactNode }) {
  const entries = [...rows];
  return (
    <div>
      <h3 className="mb-3 font-semibold">
        <Bi l={title} />
      </h3>
      {entries.length === 0 ? (
        <NoSales />
      ) : (
        <>
          {/* Phone: one compact block per row */}
          <ul className="divide-y divide-line sm:hidden">
            {entries.map(([k, t]) => (
              <li key={k} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold">{labelOf ? labelOf(k) : k}</span>
                  <span className="font-bold" dir="ltr">{money(t.total)}</span>
                </div>
                <div className="mt-1 flex gap-4 text-xs text-muted">
                  <span>{PAYMENT_METHODS.cash.ar} <b dir="ltr">{money(t.cash)}</b></span>
                  <span>{PAYMENT_METHODS.card.ar} <b dir="ltr">{money(t.card)}</b></span>
                  <span>{T.count.ar} <b>{t.count}</b></span>
                </div>
              </li>
            ))}
          </ul>
          {/* Tablet / computer: table */}
          <div className="hidden overflow-x-auto sm:block">
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
                {entries.map(([k, t]) => (
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
        </>
      )}
    </div>
  );
}

const PaymentTag = ({ s }: { s: Sale }) => (
  <span className={`inline-block rounded-sm px-2 py-0.5 ${s.payment_method === "cash" ? "bg-sand" : "bg-stone"}`}>
    <Bi l={PAYMENT_METHODS[s.payment_method]} />
  </span>
);

function Details({ s }: { s: Sale }) {
  const extra = [s.customer_name, s.customer_phone, s.notes].filter(Boolean).join(" · ");
  return (
    <>
      {s.gift_name && (
        <div className="mt-1 text-xs">
          🎀 {T.gift.ar} / {T.gift.en}: <b>{s.gift_name}</b> <span dir="ltr">({money(Number(s.gift_amount))})</span>
        </div>
      )}
      {extra && <div className="mt-1 max-w-64 whitespace-normal text-xs text-muted">{extra}</div>}
    </>
  );
}

export function SalesTable({ sales, showEmployee = false, canDelete = false }: { sales: Sale[]; showEmployee?: boolean; canDelete?: boolean }) {
  if (sales.length === 0) return <NoSales />;
  return (
    <>
      {/* Phone: cards */}
      <ul className="divide-y divide-line md:hidden">
        {sales.map((s) => (
          <li key={s.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Bi l={ORDER_TYPES[s.order_type]} className="font-medium" />
                <div className="mt-1 text-xs text-muted">
                  <span dir="ltr">{localTime(s.created_at)}</span>
                  {showEmployee && <> · {s.staff?.full_name}</>} · {FULFILLMENT[s.fulfillment].ar} / {FULFILLMENT[s.fulfillment].en}
                </div>
                <Details s={s} />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-lg font-bold" dir="ltr">{money(Number(s.amount))}</span>
                <PaymentTag s={s} />
                {canDelete && <DeleteSaleButton id={s.id} />}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {/* Tablet / computer: table */}
      <div className="hidden overflow-x-auto md:block">
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
                {showEmployee && <td className="p-2 font-semibold">{s.staff?.full_name}</td>}
                <td className="p-2">
                  <Bi l={ORDER_TYPES[s.order_type]} />
                  <Details s={s} />
                </td>
                <td className="p-2"><Bi l={FULFILLMENT[s.fulfillment]} /></td>
                <td className="p-2"><PaymentTag s={s} /></td>
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
    </>
  );
}

/** One row per day of the month, with a total row that matches the month figures. */
export function DayByDay({ days, byDay, totals }: { days: string[]; byDay: Map<string, Totals>; totals: Totals }) {
  const rows = days.map((d) => ({ date: d, day: weekday(d), t: byDay.get(d) }));
  const cell = (n: number | undefined) => (n ? money(n) : "—");
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">
        <Bi l={T.dailyBreakdown} />
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="p-2 text-start"><Bi l={T.day} /></th>
              <th className="hidden p-2 text-start sm:table-cell"><Bi l={T.count} /></th>
              <th className="p-2 text-start"><Bi l={PAYMENT_METHODS.cash} /></th>
              <th className="p-2 text-start"><Bi l={PAYMENT_METHODS.card} /></th>
              <th className="hidden p-2 text-start sm:table-cell"><Bi l={T.gifts} /></th>
              <th className="p-2 text-start"><Bi l={T.total} /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ date, day, t }) => (
              <tr key={date} className={`border-t border-line ${t ? "" : "text-muted"}`}>
                <td className="p-2">
                  <Link href={`/reports/daily?date=${date}`} className="group flex flex-col sm:flex-row sm:gap-3">
                    <span>
                      {day.ar} <span className="text-xs opacity-60">{day.en}</span>
                    </span>
                    <span className="text-xs underline underline-offset-4 group-hover:no-underline sm:text-sm" dir="ltr">
                      {date}
                    </span>
                  </Link>
                </td>
                <td className="hidden p-2 sm:table-cell" dir="ltr">{t?.count ?? 0}</td>
                <td className="p-2" dir="ltr">{cell(t?.cash)}</td>
                <td className="p-2" dir="ltr">{cell(t?.card)}</td>
                <td className="hidden p-2 sm:table-cell" dir="ltr">{cell(t?.gifts)}</td>
                <td className="p-2 font-bold" dir="ltr">{cell(t?.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-ink font-bold">
            <tr>
              <td className="p-2"><Bi l={T.monthTotal} /></td>
              <td className="hidden p-2 sm:table-cell" dir="ltr">{totals.count}</td>
              <td className="p-2" dir="ltr">{money(totals.cash)}</td>
              <td className="p-2" dir="ltr">{money(totals.card)}</td>
              <td className="hidden p-2 sm:table-cell" dir="ltr">{money(totals.gifts)}</td>
              <td className="p-2" dir="ltr">{money(totals.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
