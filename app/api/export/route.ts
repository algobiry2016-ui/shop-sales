import { NextResponse, type NextRequest } from "next/server";
import { FULFILLMENT, ORDER_TYPES, PAYMENT_METHODS, bi } from "@/lib/labels";
import { SALE_COLUMNS, type Sale } from "@/lib/report";
import { createClient, getProfile } from "@/lib/supabase/server";
import { dayRange, isDate, isMonth, localDate, localTime, monthRange } from "@/lib/time";

// CSV export of a day (?date=YYYY-MM-DD) or a month (?month=YYYY-MM). Opens in Excel.
export async function GET(request: NextRequest) {
  const profile = await getProfile();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const date = request.nextUrl.searchParams.get("date");
  const month = request.nextUrl.searchParams.get("month");
  const range = isDate(date) ? dayRange(date) : isMonth(month) ? monthRange(month) : null;
  if (!range) return NextResponse.json({ error: "Invalid period" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select(SALE_COLUMNS)
    .gte("created_at", range[0])
    .lt("created_at", range[1])
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["التاريخ / Date", "الوقت / Time", "الموظف / Employee", "نوع الطلب / Order Type", "الاستلام / Pickup-Delivery", "الدفع / Payment", "المبلغ / Amount", "الهدية / Gift", "سعر الهدية / Gift Price", "العميل / Customer", "الجوال / Phone", "ملاحظات / Notes"];
  const rows = (data as unknown as Sale[]).map((s) => [
    localDate(s.created_at),
    localTime(s.created_at),
    s.profiles?.full_name,
    bi(ORDER_TYPES[s.order_type]),
    bi(FULFILLMENT[s.fulfillment]),
    bi(PAYMENT_METHODS[s.payment_method]),
    Number(s.amount).toFixed(2),
    s.gift_name,
    s.gift_name ? Number(s.gift_amount).toFixed(2) : "",
    s.customer_name,
    s.customer_phone,
    s.notes,
  ]);
  // BOM so Excel reads Arabic correctly.
  const csv = "﻿" + [header, ...rows].map((r) => r.map(escape).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-${date ?? month}.csv"`,
    },
  });
}
