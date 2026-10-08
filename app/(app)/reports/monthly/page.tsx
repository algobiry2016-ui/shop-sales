import { PeriodPicker, PrintButton } from "@/components/client";
import { Breakdown, DayByDay, TotalsRow } from "@/components/reports";
import { Bi, Card } from "@/components/ui";
import { FULFILLMENT, ORDER_TYPES, T, type Fulfillment, type OrderType } from "@/lib/labels";
import { SALE_COLUMNS, summarize, type Sale } from "@/lib/report";
import { createClient, requireAdmin } from "@/lib/supabase/server";
import { daysOfMonth, isMonth, localMonth, monthRange } from "@/lib/time";

export default async function MonthlyReport({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireAdmin();
  const { month: param } = await searchParams;
  const month = isMonth(param) ? param : localMonth();

  const supabase = await createClient();
  const [start, end] = monthRange(month);
  const { data } = await supabase.from("shop_sales").select(SALE_COLUMNS).gte("created_at", start).lt("created_at", end).order("created_at");
  const sales = (data ?? []) as unknown as Sale[];
  const s = summarize(sales);

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-3 sm:p-4">
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="me-auto">
            <h1 className="text-2xl font-semibold">
              <Bi l={T.monthlyReport} display />
            </h1>
            <p className="mt-1 text-muted" dir="ltr">
              {month}
            </p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            <PeriodPicker type="month" value={month} />
            <PrintButton />
            <a href={`/api/export?month=${month}`} className="rounded-sm border border-ink px-3 py-2 text-sm transition hover:bg-ink hover:text-white">
              <Bi l={T.exportExcel} />
            </a>
          </div>
        </div>
        <TotalsRow totals={s.totals} />
      </Card>
      <Card>
        <DayByDay days={daysOfMonth(month)} byDay={s.byDay} totals={s.totals} />
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
    </main>
  );
}
