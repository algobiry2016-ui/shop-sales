import { FULFILLMENT, ORDER_TYPES, PAYMENT_METHODS, type Fulfillment, type OrderType, type PaymentMethod } from "./labels";
import { localTime } from "./time";

export type SaleMessage = {
  employee: string;
  amount: number;
  gift_name?: string | null;
  gift_amount?: number;
  order_type: OrderType;
  fulfillment: Fulfillment;
  payment_method: PaymentMethod;
  customer_name?: string | null;
  notes?: string | null;
  created_at: string;
};

export function formatSaleMessage(s: SaleMessage): string {
  const lines = [
    "🌸 عملية بيع جديدة / New Sale",
    `👤 الموظف / Employee: ${s.employee}`,
    `💰 المبلغ / Amount: ${s.amount.toFixed(2)} SAR`,
    `💳 الدفع / Payment: ${PAYMENT_METHODS[s.payment_method].ar} / ${PAYMENT_METHODS[s.payment_method].en}`,
    `🎁 النوع / Type: ${ORDER_TYPES[s.order_type].ar} / ${ORDER_TYPES[s.order_type].en}`,
    `🚚 الاستلام / Pickup-Delivery: ${FULFILLMENT[s.fulfillment].ar} / ${FULFILLMENT[s.fulfillment].en}`,
  ];
  if (s.gift_name) lines.push(`🎀 هدية / Gift: ${s.gift_name} (${(s.gift_amount ?? 0).toFixed(2)} SAR)`);
  if (s.customer_name) lines.push(`🙋 العميل / Customer: ${s.customer_name}`);
  if (s.notes) lines.push(`📝 ملاحظات / Notes: ${s.notes}`);
  lines.push(`🕒 ${localTime(s.created_at)}`);
  return lines.join("\n");
}

/**
 * Sends a WhatsApp message to every manager in WHATSAPP_RECIPIENTS via CallMeBot.
 * Format: "966500000000:apikey,966511111111:apikey". Failures are logged, never thrown,
 * so a WhatsApp outage never blocks recording a sale.
 */
export async function notifyManagers(text: string): Promise<void> {
  const recipients = (process.env.WHATSAPP_RECIPIENTS ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.split(":"));

  await Promise.all(
    recipients.map(async ([phone, apikey]) => {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&apikey=${encodeURIComponent(apikey ?? "")}&text=${encodeURIComponent(text)}`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) console.error(`WhatsApp to ${phone} failed: ${res.status}`);
      } catch (err) {
        console.error(`WhatsApp to ${phone} failed:`, err);
      }
    }),
  );
}
