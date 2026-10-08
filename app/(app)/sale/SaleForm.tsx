"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bi } from "@/components/ui";
import { FULFILLMENT, ORDER_TYPES, PAYMENT_METHODS, T, bi, type Bilingual, type Fulfillment, type OrderType, type PaymentMethod } from "@/lib/labels";

function Choice<K extends string>({
  name,
  title,
  options,
  value,
  onChange,
}: {
  name: string;
  title: Bilingual;
  options: Record<K, Bilingual>;
  value: K | "";
  onChange: (v: K) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-medium">
        <Bi l={title} />
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(options) as K[]).map((k) => (
          <label
            key={k}
            className={`cursor-pointer rounded-md border p-3 text-center font-medium transition ${
              value === k ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"
            }`}
          >
            <input type="radio" name={name} value={k} checked={value === k} onChange={() => onChange(k)} className="sr-only" required />
            <Bi l={options[k]} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** `today` is the shop's date (Riyadh); managers may record a sale on an earlier date. */
export function SaleForm({ canBackdate = false, today }: { canBackdate?: boolean; today: string }) {
  const router = useRouter();
  const [orderType, setOrderType] = useState<OrderType | "">("");
  const [fulfillment, setFulfillment] = useState<Fulfillment | "">("pickup");
  const [payment, setPayment] = useState<PaymentMethod | "">("");
  const [withGift, setWithGift] = useState<"yes" | "no">("no");
  const [amount, setAmount] = useState("");
  const [giftAmount, setGiftAmount] = useState("");
  const total = (Number(amount) || 0) + (withGift === "yes" ? Number(giftAmount) || 0 : 0);
  const [saleDate, setSaleDate] = useState(today);
  const backdated = canBackdate && saleDate !== today;
  // "Not specified" is only for past sales whose details nobody remembers.
  const without = <K extends string>(o: Record<K, Bilingual>) =>
    (backdated ? o : Object.fromEntries(Object.entries(o).filter(([k]) => k !== "unknown"))) as Record<K, Bilingual>;
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setStatus("saving");
    setError("");
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_type: orderType,
        fulfillment,
        payment_method: payment,
        amount,
        with_gift: withGift === "yes",
        gift_name: form.get("gift_name"),
        gift_amount: giftAmount,
        customer_name: form.get("customer_name"),
        customer_phone: form.get("customer_phone"),
        notes: form.get("notes"),
        sale_date: canBackdate && saleDate !== today ? saleDate : undefined,
      }),
    });
    if (!res.ok) {
      setStatus("idle");
      setError((await res.json().catch(() => null))?.error ?? "حدث خطأ / Something went wrong");
      return;
    }
    formEl.reset();
    setOrderType("");
    setFulfillment("pickup");
    setPayment("");
    setWithGift("no");
    setAmount("");
    setGiftAmount("");
    setStatus("saved");
    router.refresh();
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {canBackdate && (
        <label className="block">
          <Bi l={T.saleDate} className="mb-1 font-medium" />
          <input
            type="date"
            value={saleDate}
            max={today}
            required
            onChange={(e) => {
              setSaleDate(e.target.value);
              if (e.target.value === today) {
                if (orderType === "unknown") setOrderType("");
                if (fulfillment === "unknown") setFulfillment("pickup");
              }
            }}
            dir="ltr"
            className={`w-full rounded-md border p-3 ${saleDate !== today ? "border-ink bg-sand" : ""}`}
          />
          {saleDate !== today && <Bi l={T.pastDateNote} className="mt-1 text-xs text-muted" />}
        </label>
      )}
      <Choice name="order_type" title={T.orderType} options={without(ORDER_TYPES)} value={orderType} onChange={setOrderType} />
      <Choice name="fulfillment" title={T.fulfillment} options={without(FULFILLMENT)} value={fulfillment} onChange={setFulfillment} />
      <Choice name="payment_method" title={T.paymentMethod} options={PAYMENT_METHODS} value={payment} onChange={setPayment} />

      <Choice name="with_gift" title={T.withGift} options={{ no: T.no, yes: T.yes }} value={withGift} onChange={setWithGift} />

      {withGift === "yes" && (
        <div className="grid gap-3 rounded-md border border-line bg-paper p-3 sm:grid-cols-2">
          <label className="block">
            <Bi l={T.giftName} className="mb-1 text-sm font-medium" />
            <input name="gift_name" required maxLength={100} className="w-full rounded-md border p-2" />
          </label>
          <label className="block">
            <Bi l={T.giftAmount} className="mb-1 text-sm font-medium" />
            <input value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)} type="number" inputMode="decimal" min="0" step="0.01" required dir="ltr" className="w-full rounded-md border p-2" />
          </label>
        </div>
      )}

      <label className="block">
        <Bi l={withGift === "yes" ? T.flowersAmount : T.amount} className="mb-1 font-medium" />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          inputMode="decimal"
          min={withGift === "yes" ? "0" : "0.01"}
          step="0.01"
          required
          dir="ltr"
          className="w-full rounded-md border p-3 text-2xl font-semibold"
        />
      </label>

      {withGift === "yes" && (
        <div className="flex items-center justify-between rounded-md bg-ink px-4 py-3 text-white">
          <span>{bi(T.total)}</span>
          <span className="text-xl font-semibold" dir="ltr">
            {total.toFixed(2)} SAR
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <Bi l={T.customerName} className="mb-1 text-sm" />
          <input name="customer_name" maxLength={100} className="w-full rounded-md border p-2" />
        </label>
        <label className="block">
          <Bi l={T.customerPhone} className="mb-1 text-sm" />
          <input
            name="customer_phone"
            type="tel"
            inputMode="tel"
            maxLength={30}
            placeholder="05XXXXXXXX"
            dir="ltr"
            className="w-full rounded-md border p-2"
          />
        </label>
      </div>
      <label className="block">
        <Bi l={orderType === "other" ? T.notesRequired : T.notes} className="mb-1 text-sm" />
        <textarea name="notes" rows={2} maxLength={500} required={orderType === "other"} className="w-full rounded-md border p-2" />
      </label>

      {error && <p className="text-red-600">{error}</p>}
      <button
        disabled={status === "saving"}
        className={`w-full rounded-md p-4 text-lg font-semibold text-white transition disabled:opacity-50 ${status === "saved" ? "bg-[#4b5e45]" : "bg-ink hover:bg-black"}`}
      >
        <Bi l={status === "saved" ? T.saved : T.save} />
      </button>
    </form>
  );
}
