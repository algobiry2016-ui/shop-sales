import { LiveRefresh, PeriodPicker, PrintButton } from "@/components/client";
import { Breakdown, SalesTable, TotalsRow } from "@/components/reports";
import { Bi, Card } from "@/components/ui";
import { FULFILLMENT, ORDER_TYPES, T, type Fulfillment, type OrderType } from "@/lib/labels";
import { SALE_COLUMNS, summarize, type Sale } from "@/lib/report";
import { createClient, requireAdmin } from "@/lib/supabase/server";
import { dayRange, isDate, localDate, weekday } from "@/lib/time";

export default async function DailyReport({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireAdmin();
  const { date: param } = await searchParams;
  const date = isDate(param) ? param : localDate();
  const isToday = date === localDate();
  const day = weekday(date);

  const supabase = await createClient();
  const [start, end] = dayRange(date);
  const { data } = await supabase.from("shop_sales").select(SALE_COLUMNS).gte("created_at", start).lt("created_at", end).order("created_at", { ascending: false });
  const sales = (data ?? []) as unknown as Sale[];
  const s = summarize(sales);

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-3 sm:p-4">
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="me-auto">
            <h1 className="text-2xl font-semibold">
              <Bi l={T.dailyReport} display />
            </h1>
            <p className="mt-1 text-muted">
              {day.ar} · <span dir="ltr">{day.en} {date}</span>
            </p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            {isToday && <LiveRefresh />}
            <PeriodPicker type="date" value={date} />
            <PrintButton />
            <a href={`/api/export?date=${date}`} className="rounded-sm border border-ink px-3 py-2 text-sm transition hover:bg-ink hover:text-white">
              <Bi l={T.exportExcel} />
            </a>
          </div>
        </div>
        <TotalsRow totals={s.totals} />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Breakdown title={T.byEmployee} rows={s.byEmployee} />
        </Card>
        <Card>
          <Breakdown title={T.byOrderType} rows={s.byOrderType} labelOf={(k) => <Bi l={ORDER_TYPES[k as OrderType]} />} />
        </Card>
        <Card>
          <Breakdown title={T.byFulfillment} rows={s.byFulfillment} labelOf={(k) => <Bi l={FULFILLMENT[k as Fulfillment]} />} />
        </Card>
      </div>
      <Card>
        <h2 className="mb-3 text-lg font-semibold">
          <Bi l={T.transactions} />
        </h2>
        <SalesTable sales={sales} showEmployee canDelete />
      </Card>
    </main>
  );
}
