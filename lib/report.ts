import type { Fulfillment, OrderType, PaymentMethod } from "./labels";
import { localDate } from "./time";

export type Sale = {
  id: number;
  created_at: string;
  employee_id: string;
  order_type: OrderType;
  fulfillment: Fulfillment;
  payment_method: PaymentMethod;
  amount: number;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  profiles: { full_name: string } | null;
};

export const SALE_COLUMNS = "id, created_at, employee_id, order_type, fulfillment, payment_method, amount, customer_name, customer_phone, notes, profiles(full_name)";

export type Totals = { total: number; cash: number; card: number; count: number };

const emptyTotals = (): Totals => ({ total: 0, cash: 0, card: 0, count: 0 });

function add(t: Totals, s: Sale) {
  const amount = Number(s.amount);
  t.total += amount;
  t[s.payment_method] += amount;
  t.count += 1;
}

function groupBy(sales: Sale[], key: (s: Sale) => string): Map<string, Totals> {
  const map = new Map<string, Totals>();
  for (const s of sales) {
    const k = key(s);
    if (!map.has(k)) map.set(k, emptyTotals());
    add(map.get(k)!, s);
  }
  return map;
}

export function summarize(sales: Sale[]) {
  const totals = emptyTotals();
  sales.forEach((s) => add(totals, s));
  return {
    totals,
    byEmployee: groupBy(sales, (s) => s.profiles?.full_name ?? "—"),
    byOrderType: groupBy(sales, (s) => s.order_type),
    byFulfillment: groupBy(sales, (s) => s.fulfillment),
    byDay: groupBy(sales, (s) => localDate(s.created_at)),
  };
}

export const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
