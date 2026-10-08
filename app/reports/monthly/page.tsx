import Link from "next/link";
import { PeriodPicker } from "@/components/client";
import { Breakdown, TotalsRow } from "@/components/reports";
import { Bi, Card, Nav } from "@/components/ui";
import { FULFILLMENT, ORDER_TYPES, T, type Fulfillment, type OrderType } from "@/lib/labels";
import { SALE_COLUMNS, summarize, type Sale } from "@/lib/report";
import { createClient, requireAdmin } from "@/lib/supabase/server";
import { isMonth, localMonth, monthRange } from "@/lib/time";

export default async function MonthlyReport({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const profile = await requireAdmin();
  const { month: param } = await searchParams;
  const month = isMonth(param) ? param : localMonth();

  const supabase = await createClient();
  const [start, end] = monthRange(month);
  const { data } = await supabase.from("sales").select(SALE_COLUMNS).gte("created_at", start).lt("created_at", end).order("created_at");
  const sales = (data ?? []) as unknown as Sale[];
  const s = summarize(sales);

  return (
    <>
      <Nav profile={profile} active="monthly" />
      <main className="mx-auto max-w-6xl space-y-4 p-3 sm:p-4">
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h1 className="me-auto text-2xl font-semibold">
              <Bi l={T.monthlyReport} display />
            </h1>
            <PeriodPicker type="month" value={month} />
            <a href={`/api/export?month=${month}`} className="rounded-sm border border-ink px-3 py-2 text-sm transition hover:bg-ink hover:text-white">
              <Bi l={T.exportExcel} />
            </a>
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
          <Breakdown
            title={T.byDay}
            rows={s.byDay}
            labelOf={(d) => (
              <Link href={`/reports/daily?date=${d}`} className="underline underline-offset-4" dir="ltr">
                {d}
              </Link>
            )}
          />
        </Card>
      </main>
    </>
  );
}
