"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ACTIONS, BRANCHES, CHECKS, OL, waLink, type Action, type Check } from "@/lib/orders";
import { bi, type Bilingual } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { Bi } from "./bi";

type Person = { id: string; full_name: string };

// Actions that end or step back get a quieter style; the main forward step is black.
const SECONDARY: Action[] = ["return_to_florist", "failed", "cancel", "set_branch", "release"];
const NEEDS_NOTE: Action[] = ["return_to_florist", "failed", "cancel"];
const NEEDS_CHECKS: Action[] = ["assign_rep", "assign_barq", "notify_pickup", "out_for_delivery"];

export function OrderActions({
  orderId,
  actions,
  checks,
  florists,
  reps,
  needsReviewChecks,
  pickupPhone,
  reference,
}: {
  orderId: number;
  actions: Action[];
  checks: Check[];
  florists: Person[];
  reps: Person[];
  /** The checklist is asked when the order leaves review (not when a rep is swapped). */
  needsReviewChecks: boolean;
  pickupPhone: string | null;
  reference: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [person, setPerson] = useState("");
  const [tracking, setTracking] = useState("");
  const [branch, setBranch] = useState("");
  const [ticked, setTicked] = useState<Partial<Record<Check, boolean>>>({});

  if (!actions.length) return null;

  const askChecks = (a: Action) => NEEDS_CHECKS.includes(a) && (a !== "assign_rep" || needsReviewChecks);
  const simple = (a: Action) => !NEEDS_NOTE.includes(a) && !askChecks(a) && !["assign_florist", "assign_rep", "assign_barq", "set_branch"].includes(a);

  async function run(a: Action) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: a, note, florist_id: person, rep_id: person, tracking_number: tracking, branch, checks: ticked }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Error");
    if (a === "notify_pickup") {
      const link = waLink(pickupPhone, `مرحبا، طلبك ${reference} من دوكمنتيشن جاهز للاستلام من المحل 🌸`);
      if (link) window.open(link, "_blank");
    }
    setOpen(null);
    setNote("");
    setPerson("");
    setTicked({});
    router.refresh();
  }

  function click(a: Action) {
    if (simple(a)) {
      if (confirm(`${bi(ACTIONS[a])}؟`)) run(a);
      return;
    }
    setError("");
    setOpen(open === a ? null : a);
  }

  const allTicked = checks.every((c) => ticked[c]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a}
            onClick={() => click(a)}
            disabled={busy}
            className={`rounded-md px-4 py-3 text-sm font-medium transition disabled:opacity-50 ${
              SECONDARY.includes(a)
                ? `border border-line ${a === "cancel" || a === "failed" ? "text-red-700 hover:bg-red-50" : "hover:bg-sand"}`
                : "flex-1 bg-ink text-white hover:opacity-90"
            } ${open === a ? "ring-2 ring-ink ring-offset-1" : ""}`}
          >
            <Bi l={ACTIONS[a]} />
          </button>
        ))}
      </div>

      {open && (
        <div className="space-y-3 rounded-md border border-line bg-paper p-3">
          {open === "assign_florist" && <Picker people={florists} label={OL.florist} value={person} onChange={setPerson} />}
          {open === "assign_rep" && <Picker people={reps} label={OL.rep} value={person} onChange={setPerson} />}
          {open === "set_branch" && (
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full rounded-md border border-line bg-white p-3">
              <option value="">{bi(OL.choose)}</option>
              {Object.entries(BRANCHES).map(([k, l]) => (
                <option key={k} value={k}>
                  {bi(l)}
                </option>
              ))}
            </select>
          )}
          {open === "assign_barq" && (
            <label className="block">
              <Bi l={OL.tracking} className="mb-1 text-sm" />
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} dir="ltr" className="w-full rounded-md border p-3" />
            </label>
          )}
          {askChecks(open) && (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">
                <Bi l={OL.checklist} />
              </legend>
              {checks.map((c) => (
                <label key={c} className="flex items-center gap-3 rounded-md border border-line bg-white p-3">
                  <input type="checkbox" checked={!!ticked[c]} onChange={(e) => setTicked({ ...ticked, [c]: e.target.checked })} className="h-5 w-5" />
                  <Bi l={CHECKS[c]} />
                </label>
              ))}
            </fieldset>
          )}
          {NEEDS_NOTE.includes(open) && (
            <label className="block">
              <Bi l={OL.reason} className="mb-1 text-sm" />
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} className="w-full rounded-md border p-2" />
            </label>
          )}
          <button
            onClick={() => run(open)}
            disabled={
              busy ||
              (askChecks(open) && !allTicked) ||
              (NEEDS_NOTE.includes(open) && !note.trim()) ||
              ((open === "assign_florist" || open === "assign_rep") && !person) ||
              (open === "assign_barq" && !tracking.trim()) ||
              (open === "set_branch" && !branch)
            }
            className="w-full rounded-md bg-ink px-4 py-3 font-medium text-white disabled:opacity-40"
          >
            <Bi l={OL.confirm} />
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Picker({ people, label, value, onChange }: { people: Person[]; label: Bilingual; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <Bi l={label} className="mb-1 text-sm" />
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-line bg-white p-3">
        <option value="">{bi(OL.choose)}</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Takes or picks a photo, shrinks it on the phone (max 1600px JPEG) and uploads it. */
export function PhotoUpload({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const blob = await shrink(file);
      const form = new FormData();
      form.append("photo", blob, "photo.jpg");
      const res = await fetch(`/api/orders/${orderId}/photo`, { method: "POST", body: form });
      if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Error");
      else router.refresh();
    } catch {
      setError("Error");
    }
    setBusy(false);
  }

  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-ink p-4 text-center">
      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} disabled={busy} />
      <Bi l={busy ? OL.uploading : OL.takePhoto} className="font-medium" />
      {error && <span className="text-sm text-red-600">{error}</span>}
    </label>
  );
}

async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject()), "image/jpeg", 0.8));
}

/** Refreshes the page when an order changes (Realtime), and every minute as a fallback. */
export function LiveOrders() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_orders" }, () => router.refresh())
      .subscribe();
    const timer = setInterval(() => router.refresh(), 60_000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [router]);
  return null;
}
