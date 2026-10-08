import { Bi, Card, Nav } from "@/components/ui";
import { SalesTable, TotalsRow } from "@/components/reports";
import { T } from "@/lib/labels";
import { SALE_COLUMNS, summarize, type Sale } from "@/lib/report";
import { createClient, requireProfile } from "@/lib/supabase/server";
import { dayRange, localDate } from "@/lib/time";
import { SaleForm } from "./SaleForm";

export default async function SalePage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [start, end] = dayRange(localDate());
  const { data } = await supabase
    .from("sales")
    .select(SALE_COLUMNS)
    .eq("employee_id", profile.id)
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false });
  const sales = (data ?? []) as unknown as Sale[];

  return (
    <>
      <Nav profile={profile} active="sale" />
      <main className="mx-auto max-w-2xl space-y-4 p-3 sm:p-4">
        <Card>
          <h1 className="mb-4 text-2xl font-semibold">
            <Bi l={T.newSale} display />
          </h1>
          <SaleForm />
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">
            <Bi l={T.mySalesToday} />
          </h2>
          <TotalsRow totals={summarize(sales).totals} />
          <SalesTable sales={sales} />
        </Card>
      </main>
    </>
  );
}
