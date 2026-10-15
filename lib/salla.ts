import { createHmac, timingSafeEqual } from "node:crypto";
import { localDate } from "./time";

/**
 * Salla signs each webhook with SALLA_WEBHOOK_SECRET (Salla Partners → the app → Webhooks).
 * The header is a hex HMAC-SHA256 of the raw body. The secret lives only in Vercel.
 */
export function verifySallaSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.SALLA_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Saudi mobile as 05XXXXXXXX (same format as shop sales and the delivery system), else null. */
export function saudiMobile(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const digits = String(v).replace(/\D/g, "").replace(/^00/, "").replace(/^966/, "").replace(/^0/, "");
  return /^5\d{8}$/.test(digits) ? `0${digits}` : null;
}

export type Branch = "riyadh" | "khamis";

// The store's two branches in Salla (Settings → Branches). Each order carries the branch
// it is fulfilled from in `order_branches`, which is what splits the orders between the
// Riyadh and Khamis Mushait teams. Customer cities are unreliable for this: the sender
// often lives elsewhere (Jeddah, Tanomah…) and Salla's city is the customer's, not the
// recipient's.
const SALLA_BRANCHES: Record<string, Branch> = {
  "154195627": "khamis", // خميس مشيط (default; scope "ابها وخميس مشيط")
  "647258579": "riyadh", // الرياض
};

function branchOfOrder(order: Record<string, unknown>): Branch | null {
  const branches = Array.isArray(order.order_branches) ? order.order_branches : [];
  for (const b of branches) {
    const branch = SALLA_BRANCHES[String((b as { id?: unknown })?.id)];
    if (branch) return branch;
  }
  const scope = (order.scope as { name?: unknown } | null)?.name;
  return typeof scope === "string" ? branchOfCity(scope) : null;
}

// Fallback only, when an order has no branch: names that point to a branch. Anything
// else stays without a branch and shows up for the managers to place by hand.
const BRANCH_CITIES: Record<Branch, string[]> = {
  riyadh: ["الرياض", "riyadh"],
  khamis: ["خميس مشيط", "khamis mushait", "khamis mushayt", "أبها", "ابها", "abha", "أحد رفيدة", "احد رفيدة", "ahad rafidah", "تندحة", "tendaha"],
};

export function branchOfCity(city: string | null): Branch | null {
  if (!city) return null;
  const c = city.trim().toLowerCase();
  for (const [branch, names] of Object.entries(BRANCH_CITIES) as [Branch, string[]][]) {
    if (names.some((n) => c.includes(n.toLowerCase()))) return branch;
  }
  return null;
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);

/** Every { name, value } option on the order and its items: where Salla keeps custom fields. */
function options(order: Json): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = [];
  const push = (o: unknown) => {
    const name = str(obj(o).name);
    const raw = obj(o).value;
    const value = str(raw) ?? str(obj(raw).name) ?? (Array.isArray(raw) ? raw.map((x) => str(x) ?? str(obj(x).name)).filter(Boolean).join("، ") : null);
    if (name && value) out.push({ name, value });
  };
  for (const item of Array.isArray(order.items) ? order.items : []) for (const o of (obj(item).options as unknown[]) ?? []) push(o);
  for (const key of ["options", "custom_fields"]) for (const o of Array.isArray(order[key]) ? (order[key] as unknown[]) : []) push(o);
  return out;
}

const DATE_RE = /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;

function deliveryDate(opts: { name: string; value: string }[], order: Json): string | null {
  const candidates = [
    ...opts.filter((o) => /تاريخ|date|موعد/i.test(o.name)).map((o) => o.value),
    str(obj(order.delivery).date),
    str(obj(order.shipping).delivery_date),
  ];
  for (const c of candidates) {
    const m = c?.match(DATE_RE);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }
  return null;
}

/** 9–12 morning, 2–7 afternoon, 7–11 evening. */
function deliverySlot(opts: { name: string; value: string }[]): "morning" | "afternoon" | "evening" | null {
  for (const o of opts.filter((o) => /فترة|وقت|time|slot|period/i.test(o.name))) {
    const v = o.value.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
    const nums = (v.match(/\d{1,2}/g) ?? []).map(Number);
    if (nums.includes(9) && nums.includes(12)) return "morning";
    if (nums.includes(2) && nums.includes(7)) return "afternoon";
    if (nums.includes(7) && nums.includes(11)) return "evening";
    if (/صباح|morning/i.test(v)) return "morning";
    if (/عصر|ظهر|afternoon/i.test(v)) return "afternoon";
    if (/مساء|ليل|evening|night/i.test(v)) return "evening";
  }
  return null;
}

/**
 * The fields we need from a Salla order. Salla's payload has many optional parts, so every
 * field is read defensively; the whole order is also kept in `raw` for anything missed.
 */
export function parseSallaOrder(order: Json) {
  const customer = obj(order.customer);
  const shipping = obj(order.shipping);
  const receiver = obj(shipping.receiver);
  const address = obj(shipping.address ?? shipping.pickup_address);
  const opts = options(order);
  const city = str(address.city) ?? str(customer.city);
  const date = deliveryDate(opts, order);
  // Option names as the store writes them on each product (Salla product options):
  // رسالتك للمستلم، رقم المستلم، اكتب اسم الحي (عنوان المستلم)، هدية من مجهول،
  // معك باركود QR ؟، عندك صورة…؟
  const opt = (re: RegExp) => opts.find((o) => re.test(o.name))?.value ?? null;
  const card = opt(/رسالت|رسالة|إهداء|اهداء|بطاقة|كرت|card|message/i);
  const recipientPhone = opt(/رقم المستلم|جوال المستلم|recipient/i);
  const district = opt(/عنوان|الحي|address/i);

  return {
    salla_id: Number(order.id),
    reference: str(order.reference_id),
    branch: branchOfOrder(order) ?? branchOfCity(city),
    delivery_date: date,
    delivery_slot: deliverySlot(opts),
    customer_name: [str(customer.first_name), str(customer.last_name)].filter(Boolean).join(" ") || str(customer.name),
    customer_phone: saudiMobile(`${str(customer.mobile_code) ?? ""}${str(customer.mobile) ?? ""}`) ?? saudiMobile(customer.mobile),
    recipient_name: str(receiver.name),
    recipient_phone: saudiMobile(recipientPhone) ?? saudiMobile(receiver.phone ?? receiver.mobile),
    city,
    address: district ?? str(address.shipping_address) ?? str(address.street_address) ?? str(address.address),
    card_message: card,
    /** "هدية من مجهول": the sender's details must not reach the recipient or the rep. */
    anonymous: !!opt(/مجهول|anonymous/i),
    /** Customer's QR link and uploaded photo, for the florist. */
    attachments: opts.filter((o) => /باركود|QR|صورة|image/i.test(o.name)).map((o) => ({ name: o.name, value: o.value })),
    items: (Array.isArray(order.items) ? order.items : []).map((i) => ({
      name: str(obj(i).name),
      quantity: Number(obj(i).quantity) || 1,
      image: str(obj(i).thumbnail) ?? str(obj(i).product_thumbnail) ?? str(obj(obj(i).product).thumbnail),
    })),
    total: Number(obj(obj(order.amounts).total).amount) || null,
    salla_status: str(obj(order.status).slug) ?? str(obj(order.status).name),
    /** A future order waits as "scheduled" until the florists' shift that prepares it. */
    status: date && releaseDate(date, deliverySlot(opts)) > localDate() ? ("scheduled" as const) : ("new" as const),
    raw: order,
  };
}

/** One day before a YYYY-MM-DD date. */
function dayBefore(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * The day an order goes to the website manager, at the florists' 1 PM shift. Morning
 * orders (9–12) are prepared the night before and kept in the fridge, so they go out the
 * day before; so do orders without a known slot, to be safe. The rest go out on the day.
 */
export function releaseDate(deliveryDate: string, slot: string | null): string {
  return slot === "afternoon" || slot === "evening" ? deliveryDate : dayBefore(deliveryDate);
}

export const isSallaCanceled = (slug: string | null) => !!slug && /cancel|ملغ/i.test(slug);
