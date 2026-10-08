"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bi } from "@/components/ui";
import { FULFILLMENT, ORDER_TYPES, PAYMENT_METHODS, T, type Bilingual, type Fulfillment, type OrderType, type PaymentMethod } from "@/lib/labels";

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
      <legend className="mb-2 font-semibold">
        <Bi l={title} />
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(options) as K[]).map((k) => (
          <label
            key={k}
            className={`cursor-pointer rounded-xl border-2 p-3 text-center font-semibold transition ${
              value === k ? "border-pink-700 bg-pink-50 text-pink-800" : "border-gray-200 bg-white"
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

export function SaleForm() {
  const router = useRouter();
  const [orderType, setOrderType] = useState<OrderType | "">("");
  const [fulfillment, setFulfillment] = useState<Fulfillment | "">("pickup");
  const [payment, setPayment] = useState<PaymentMethod | "">("");
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
        amount: form.get("amount"),
        customer_name: form.get("customer_name"),
        customer_phone: form.get("customer_phone"),
        notes: form.get("notes"),
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
    setStatus("saved");
    router.refresh();
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Choice name="order_type" title={T.orderType} options={ORDER_TYPES} value={orderType} onChange={setOrderType} />
      <Choice name="fulfillment" title={T.fulfillment} options={FULFILLMENT} value={fulfillment} onChange={setFulfillment} />
      <Choice name="payment_method" title={T.paymentMethod} options={PAYMENT_METHODS} value={payment} onChange={setPayment} />

      <label className="block">
        <Bi l={T.amount} className="mb-1 font-semibold" />
        <input name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" required dir="ltr" className="w-full rounded-xl border-2 p-3 text-2xl font-bold" />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <Bi l={T.customerName} className="mb-1 text-sm" />
          <input name="customer_name" maxLength={100} className="w-full rounded-lg border p-2" />
        </label>
        <label className="block">
          <Bi l={T.customerPhone} className="mb-1 text-sm" />
          <input name="customer_phone" type="tel" maxLength={30} dir="ltr" className="w-full rounded-lg border p-2" />
        </label>
      </div>
      <label className="block">
        <Bi l={T.notes} className="mb-1 text-sm" />
        <textarea name="notes" rows={2} maxLength={500} className="w-full rounded-lg border p-2" />
      </label>

      {error && <p className="text-red-600">{error}</p>}
      <button
        disabled={status === "saving"}
        className={`w-full rounded-xl p-4 text-xl font-bold text-white disabled:opacity-50 ${status === "saved" ? "bg-green-600" : "bg-pink-700"}`}
      >
        <Bi l={status === "saved" ? T.saved : T.save} />
      </button>
    </form>
  );
}
