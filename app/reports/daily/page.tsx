import { LiveRefresh, PeriodPicker } from "@/components/client";
import { Breakdown, SalesTable, TotalsRow } from "@/components/reports";
import { Bi, Card, Nav } from "@/components/ui";
import { FULFILLMENT, ORDER_TYPES, T, type Fulfillment, type OrderType } from "@/lib/labels";
import { SALE_COLUMNS, summarize, type Sale } from "@/lib/report";
import { createClient, requireAdmin } from "@/lib/supabase/server";
import { dayRange, isDate, localDate } from "@/lib/time";

export default async function DailyReport({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const profile = await requireAdmin();
  const { date: param } = await searchParams;
  const date = isDate(param) ? param : localDate();
  const isToday = date === localDate();

  const supabase = await createClient();
  const [start, end] = dayRange(date);
  const { data } = await supabase.from("sales").select(SALE_COLUMNS).gte("created_at", start).lt("created_at", end).order("created_at", { ascending: false });
  const sales = (data ?? []) as unknown as Sale[];
  const s = summarize(sales);

  return (
    <>
      <Nav profile={profile} active="daily" />
      <main className="mx-auto max-w-5xl space-y-4 p-4">
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h1 className="me-auto text-xl font-bold text-pink-700">
              <Bi l={T.dailyReport} />
            </h1>
            {isToday && <LiveRefresh />}
            <PeriodPicker type="date" value={date} />
            <a href={`/api/export?date=${date}`} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white">
              <Bi l={T.exportExcel} />
            </a>
          </div>
          <TotalsRow totals={s.totals} />
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
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
          <h2 className="mb-3 text-lg font-bold">
            <Bi l={T.transactions} />
          </h2>
          <SalesTable sales={sales} showEmployee canDelete />
        </Card>
      </main>
    </>
  );
}
