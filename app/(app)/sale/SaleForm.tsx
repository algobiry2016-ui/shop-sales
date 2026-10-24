"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bi } from "@/components/ui";
import { AREAS, FULFILLMENT, ORDER_TYPES, PAYMENT_METHODS, SLOTS, T, bi, type Bilingual, type Fulfillment, type OrderType, type PaymentMethod } from "@/lib/labels";

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
  const [withGiftChoice, setWithGift] = useState<"yes" | "no">("no");
  const [amount, setAmount] = useState("");
  const [giftAmount, setGiftAmount] = useState("");
  const [saleDate, setSaleDate] = useState(today);
  const backdated = canBackdate && saleDate !== today;
  // Past sales are entered quickly from old records: no gift question.
  const withGift = backdated ? "no" : withGiftChoice;
  // A delivery (today or later) goes on to the supervisor: where, when, its fee and the card.
  const delivering = fulfillment === "delivery" && !backdated;
  const [area, setArea] = useState("");
  const [fee, setFee] = useState("");
  const [deliveryDay, setDeliveryDay] = useState(today);
  const [slot, setSlot] = useState<keyof typeof SLOTS | "">("");
  const [photo, setPhoto] = useState<string | null>(null);
  const total = (Number(amount) || 0) + (withGift === "yes" ? Number(giftAmount) || 0 : 0) + (delivering ? Number(fee) || 0 : 0);
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
        delivery: delivering
          ? { area, fee, date: deliveryDay, slot: slot || null, card_message: form.get("card_message"), recipient_phone: form.get("recipient_phone") }
          : undefined,
        photo: delivering ? photo : undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setStatus("idle");
      setError(data?.error ?? "حدث خطأ / Something went wrong");
      return;
    }
    // The sale is saved; its delivery didn't reach the supervisor (it can be resent from the list).
    if (data?.delivery_error) alert(`${bi(T.notSent)}: ${data.delivery_error}`);
    formEl.reset();
    // Past sales keep "Not specified" so the next one on the same day needs only payment and amount.
    setOrderType(backdated ? "unknown" : "");
    setFulfillment(backdated ? "unknown" : "pickup");
    setPayment("");
    setWithGift("no");
    setAmount("");
    setGiftAmount("");
    setArea("");
    setFee("");
    setDeliveryDay(today);
    setSlot("");
    setPhoto(null);
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
              const past = e.target.value !== today;
              setSaleDate(e.target.value);
              // A past date starts on "Not specified"; back to today, it returns to the normal start.
              if (past && !backdated) {
                setOrderType("unknown");
                setFulfillment("unknown");
              } else if (!past) {
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
      {delivering && (
        <fieldset className="space-y-3 rounded-md border-2 border-ink bg-paper p-3">
          <legend className="px-1 font-semibold">
            🚚 <Bi l={T.delivery} />
          </legend>
          <Bi l={T.deliveryNote} className="text-xs text-muted" />
          <div>
            <Bi l={T.area} className="mb-1 text-sm font-medium" />
            <div className="grid grid-cols-2 gap-2">
              {AREAS.map((a) => (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => {
                    setArea(a.name);
                    setFee(String(a.fee));
                  }}
                  className={`rounded-md border p-3 text-sm font-medium ${area === a.name ? "border-ink bg-ink text-white" : "border-line bg-white"}`}
                >
                  {a.name} <span dir="ltr">· {a.fee}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <Bi l={T.deliveryFee} className="mb-1 text-sm font-medium" />
              <input value={fee} onChange={(e) => setFee(e.target.value)} type="number" inputMode="decimal" min="0" step="0.01" required dir="ltr" className="w-full rounded-md border p-2" />
            </label>
            <label className="block">
              <Bi l={T.deliveryDay} className="mb-1 text-sm font-medium" />
              <input value={deliveryDay} onChange={(e) => setDeliveryDay(e.target.value)} type="date" min={today} required dir="ltr" className="w-full rounded-md border p-2" />
            </label>
          </div>
          <div>
            <Bi l={T.slot} className="mb-1 text-sm font-medium" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["", ...Object.keys(SLOTS)] as ("" | keyof typeof SLOTS)[]).map((k) => (
                <button key={k || "any"} type="button" onClick={() => setSlot(k)} className={`rounded-md border p-2 text-sm ${slot === k ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
                  {k ? SLOTS[k].ar : T.anyTime.ar}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <Bi l={T.recipientPhone} className="mb-1 text-sm" />
            <input name="recipient_phone" type="tel" inputMode="tel" maxLength={30} placeholder="05XXXXXXXX" dir="ltr" className="w-full rounded-md border p-2" />
          </label>
          <label className="block">
            <Bi l={T.cardMessage} className="mb-1 text-sm" />
            <textarea name="card_message" rows={2} maxLength={1000} className="w-full rounded-md border p-2" />
          </label>
          <label className="block">
            <Bi l={T.orderPhoto} className="mb-1 text-sm" />
            <input type="file" accept="image/*" onChange={async (e) => setPhoto(e.target.files?.[0] ? await shrink(e.target.files[0]) : null)} className="w-full text-sm" />
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="mt-2 h-24 rounded-sm border border-line object-cover" />
            )}
          </label>
          <Bi l={T.needPhone} className="text-xs text-muted" />
        </fieldset>
      )}

      <Choice name="payment_method" title={T.paymentMethod} options={PAYMENT_METHODS} value={payment} onChange={setPayment} />

      {!backdated && <Choice name="with_gift" title={T.withGift} options={{ no: T.no, yes: T.yes }} value={withGift} onChange={setWithGift} />}

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
        <Bi l={delivering ? T.orderAmount : withGift === "yes" ? T.flowersAmount : T.amount} className="mb-1 font-medium" />
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

      {(withGift === "yes" || delivering) && (
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
        disabled={status === "saving" || (delivering && !area)}
        className={`w-full rounded-md p-4 text-lg font-semibold text-white transition disabled:opacity-50 ${status === "saved" ? "bg-[#4b5e45]" : "bg-ink hover:bg-black"}`}
      >
        <Bi l={status === "saved" ? T.saved : T.save} />
      </button>
    </form>
  );
}

/** The order photo, shrunk on the phone (max 1280px JPEG) so it goes up quickly. */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
