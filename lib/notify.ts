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

const TELEGRAM_API = "https://api.telegram.org";

/**
 * Sends a message to the managers' Telegram group (or chats) via the shop's bot.
 * TELEGRAM_BOT_TOKEN comes from @BotFather; TELEGRAM_CHAT_ID is one or more chat ids,
 * comma-separated (see /api/telegram/chats). Failures are logged, never thrown, so a
 * Telegram outage never blocks recording a sale.
 */
export async function notifyManagers(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!token || chatIds.length === 0) return;

  await Promise.all(
    chatIds.map(async (chatId) => {
      try {
        const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) console.error(`Telegram to ${chatId} failed: ${res.status} ${await res.text()}`);
      } catch (err) {
        console.error(`Telegram to ${chatId} failed:`, err);
      }
    }),
  );
}

/** Chats the bot has seen recently (a group it was added to, or a person who messaged it). */
export async function recentTelegramChats(): Promise<{ id: number; name: string; type: string }[]> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return [];
  const res = await fetch(`${TELEGRAM_API}/bot${token}/getUpdates`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  const data = await res.json().catch(() => null);
  const chats = new Map<number, { id: number; name: string; type: string }>();
  for (const u of data?.result ?? []) {
    const chat = (u.message ?? u.my_chat_member ?? u.channel_post ?? u.edited_message)?.chat;
    if (chat) chats.set(chat.id, { id: chat.id, name: chat.title ?? [chat.first_name, chat.last_name].filter(Boolean).join(" "), type: chat.type });
  }
  return [...chats.values()];
}
