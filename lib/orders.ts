import type { Bilingual } from "./labels";
import type { Profile } from "./roles";

// Website (Salla) orders: the cycle from the website manager to the delivered order.

export const ORDER_STATUS = {
  scheduled: { ar: "مجدول", en: "Scheduled" },
  new: { ar: "جديد", en: "New" },
  with_florist: { ar: "عند المنسق", en: "With Florist" },
  ready: { ar: "جاهز للمراجعة", en: "Ready for Review" },
  awaiting_pickup: { ar: "بانتظار الاستلام", en: "Awaiting Pickup" },
  with_rep: { ar: "مع المندوب", en: "With Rep" },
  with_barq: { ar: "مع برق", en: "With Barq" },
  out_for_delivery: { ar: "خرج للتوصيل", en: "Out for Delivery" },
  delivered: { ar: "تم التسليم", en: "Delivered" },
  canceled: { ar: "ملغي", en: "Canceled" },
} as const satisfies Record<string, Bilingual>;
export type OrderStatus = keyof typeof ORDER_STATUS;

export const SLOTS = {
  morning: { ar: "الفترة الأولى (الصباح)", en: "Morning" },
  afternoon: { ar: "2 – 7 مساءً", en: "2 – 7 PM" },
  evening: { ar: "7 – 11 مساءً", en: "7 – 11 PM" },
} as const satisfies Record<string, Bilingual>;

export const BRANCHES = {
  khamis: { ar: "خميس مشيط", en: "Khamis Mushait" },
  riyadh: { ar: "الرياض", en: "Riyadh" },
} as const satisfies Record<string, Bilingual>;
export type Branch = keyof typeof BRANCHES;

export const PAYMENTS: Record<string, Bilingual> = {
  mada: { ar: "مدى", en: "Mada" },
  credit_card: { ar: "بطاقة ائتمانية", en: "Credit Card" },
  tabby_installment: { ar: "تابي", en: "Tabby" },
  tamara_installment: { ar: "تمارا", en: "Tamara" },
};

/** The handover checklist the supervisor and the rep confirm. */
export const CHECKS = {
  card: { ar: "الكرت مطابق للعبارة", en: "Card matches the message" },
  qr: { ar: "الباركود مرفق", en: "QR code attached" },
  photo: { ar: "الطلب مطابق للصورة", en: "Order matches the photo" },
} as const satisfies Record<string, Bilingual>;
export type Check = keyof typeof CHECKS;

export type Order = {
  id: number;
  salla_id: number;
  reference: string | null;
  branch: Branch | null;
  status: OrderStatus;
  delivery_date: string | null;
  delivery_slot: keyof typeof SLOTS | null;
  customer_name: string | null;
  customer_phone: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  city: string | null;
  delivery_area: string | null;
  pickup: boolean;
  address: string | null;
  card_message: string | null;
  anonymous: boolean;
  attachments: { name: string; value: string }[];
  items: { name: string | null; quantity: number; image: string | null }[];
  total: number | null;
  payment_method: string | null;
  delivery_fee: number | null;
  florist_id: string | null;
  rep_id: string | null;
  tracking_number: string | null;
  ready_photo: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  florist?: { full_name: string } | null;
  rep?: { full_name: string } | null;
};

export const ORDER_COLUMNS =
  "id, salla_id, reference, branch, status, delivery_date, delivery_slot, customer_name, customer_phone, recipient_name, recipient_phone, city, delivery_area, pickup, address, card_message, anonymous, attachments, items, total, payment_method, delivery_fee, florist_id, rep_id, tracking_number, ready_photo, note, created_at, updated_at, florist:shop_staff!shop_orders_florist_id_fkey(full_name), rep:shop_staff!shop_orders_rep_id_fkey(full_name)";

export type OrderEvent = {
  id: number;
  at: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  checks: Partial<Record<Check, boolean>> | null;
  actor: { full_name: string } | null;
};

/** An anonymous gift's sender never reaches the rep. */
export function forRep(o: Order): Order {
  return o.anonymous ? { ...o, customer_name: null, customer_phone: null } : o;
}

/** Which checklist items apply to this order (the QR line only when the customer sent one). */
export function checksFor(o: Order): Check[] {
  const hasQr = o.attachments.some((a) => /باركود|QR/i.test(a.name));
  return (["card", ...(hasQr ? ["qr"] : []), "photo"] as Check[]).filter((c) => c !== "card" || !!o.card_message);
}

// ─── Actions ──────────────────────────────────────────────────────────────

export const ACTIONS = {
  assign_florist: { ar: "إسناد لمنسق", en: "Assign Florist" },
  ready: { ar: "جاهز (مع الصورة)", en: "Ready (with photo)" },
  return_to_florist: { ar: "إرجاع للمنسق", en: "Return to Florist" },
  assign_rep: { ar: "إسناد لمندوب", en: "Assign Rep" },
  assign_barq: { ar: "تسليم لبرق", en: "Hand to Barq" },
  notify_pickup: { ar: "بلّغ العميل يستلم", en: "Tell Customer to Collect" },
  picked_up: { ar: "تم الاستلام من المحل", en: "Collected" },
  out_for_delivery: { ar: "خرج للتوصيل", en: "Out for Delivery" },
  delivered: { ar: "تم التسليم", en: "Delivered" },
  failed: { ar: "تعذّر التسليم", en: "Delivery Failed" },
  release: { ar: "إظهار الآن", en: "Release Now" },
  set_branch: { ar: "تحديد الفرع", en: "Set Branch" },
  cancel: { ar: "إلغاء الطلب", en: "Cancel Order" },
} as const satisfies Record<string, Bilingual>;
export type Action = keyof typeof ACTIONS;

const inBranch = (p: Profile, o: Order) => p.role === "admin" || (p.branch !== null && p.branch === o.branch);
const manager = (p: Profile, o: Order) => p.role === "admin" || (p.role === "site_manager" && inBranch(p, o));
const supervisor = (p: Profile, o: Order) => p.role === "admin" || (p.role === "supervisor" && inBranch(p, o));

/** The actions this person can take on this order now. The server checks the same list. */
export function allowedActions(p: Profile, o: Order): Action[] {
  const out: Action[] = [];
  const s = o.status;
  if (p.role === "admin" && !o.branch) out.push("set_branch");
  if (manager(p, o) && s === "scheduled") out.push("release");
  if (manager(p, o) && (s === "new" || s === "with_florist")) out.push("assign_florist");
  if (s === "with_florist" && (o.florist_id === p.id || p.role === "admin")) out.push("ready");
  if (supervisor(p, o) && s === "ready") {
    out.push("return_to_florist");
    if (o.pickup) out.push("notify_pickup");
    else {
      out.push("assign_rep");
      if (o.branch === "riyadh") out.push("assign_barq");
    }
  }
  if (supervisor(p, o) && s === "awaiting_pickup") out.push("picked_up");
  if (supervisor(p, o) && (s === "with_rep" || s === "with_barq")) out.push("assign_rep");
  const myRep = o.rep_id === p.id || supervisor(p, o);
  if (s === "with_rep" && myRep) out.push("out_for_delivery", "failed");
  if (s === "out_for_delivery" && myRep) out.push("delivered", "failed");
  if (s === "with_barq" && supervisor(p, o)) out.push("delivered");
  if (manager(p, o) && s !== "delivered" && s !== "canceled") out.push("cancel");
  return [...new Set(out)];
}

/** Board columns for managers and supervisors, in cycle order. */
export const BOARD: OrderStatus[] = ["new", "with_florist", "ready", "awaiting_pickup", "with_rep", "with_barq", "out_for_delivery", "scheduled"];

/** Private storage bucket for the finished-order photos. */
export const PHOTO_BUCKET = "shop-orders";

/** Screen labels for the orders pages (Arabic on top, English under it). */
export const OL = {
  orders: { ar: "الطلبات", en: "Orders" },
  myOrders: { ar: "طلباتي", en: "My Orders" },
  noOrders: { ar: "لا توجد طلبات", en: "No orders" },
  doneToday: { ar: "المنتهية آخر 24 ساعة", en: "Finished (24h)" },
  active: { ar: "الحالية", en: "Active" },
  all: { ar: "الكل", en: "All" },
  noBranch: { ar: "بدون فرع", en: "No Branch" },
  delivery: { ar: "التوصيل", en: "Delivery" },
  pickup: { ar: "استلام من المحل", en: "Store Pickup" },
  date: { ar: "الموعد", en: "Date" },
  slot: { ar: "الفترة", en: "Period" },
  area: { ar: "الموقع / الحي", en: "Area" },
  items: { ar: "المنتجات", en: "Items" },
  card: { ar: "عبارة الكرت", en: "Card Message" },
  noCard: { ar: "بدون عبارة", en: "No message" },
  attachments: { ar: "مرفقات العميل", en: "Customer Attachments" },
  recipient: { ar: "المستلم", en: "Recipient" },
  sender: { ar: "المرسل", en: "Sender" },
  anonymous: { ar: "هدية من مجهول — لا تذكر المرسل", en: "Anonymous gift — don't mention the sender" },
  payment: { ar: "الدفع", en: "Payment" },
  total: { ar: "الإجمالي", en: "Total" },
  deliveryFee: { ar: "التوصيل", en: "Delivery Fee" },
  florist: { ar: "المنسق", en: "Florist" },
  rep: { ar: "المندوب", en: "Rep" },
  readyPhoto: { ar: "صورة الطلب الجاهز", en: "Finished Order Photo" },
  takePhoto: { ar: "تصوير / رفع صورة الطلب", en: "Take / Upload Photo" },
  uploading: { ar: "جاري الرفع…", en: "Uploading…" },
  history: { ar: "سجل الطلب", en: "Order History" },
  note: { ar: "ملاحظة", en: "Note" },
  reason: { ar: "السبب", en: "Reason" },
  tracking: { ar: "رقم شحنة برق", en: "Barq Tracking No." },
  checklist: { ar: "قائمة المراجعة", en: "Checklist" },
  confirm: { ar: "تأكيد", en: "Confirm" },
  back: { ar: "رجوع", en: "Back" },
  call: { ar: "اتصال", en: "Call" },
  whatsapp: { ar: "واتساب", en: "WhatsApp" },
  inSalla: { ar: "في سلة", en: "In Salla" },
  branch: { ar: "الفرع", en: "Branch" },
  choose: { ar: "اختر…", en: "Choose…" },
} as const satisfies Record<string, Bilingual>;

/** 05XXXXXXXX → wa.me link with a ready message. */
export function waLink(phone: string | null, text: string): string | null {
  return phone && /^05\d{8}$/.test(phone) ? `https://wa.me/966${phone.slice(1)}?text=${encodeURIComponent(text)}` : null;
}
