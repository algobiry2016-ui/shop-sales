// Every label in the app is shown in Arabic and English together.

export type Bilingual = { ar: string; en: string };

export const ORDER_TYPES = {
  ready_made: { ar: "جاهز", en: "Ready-made" },
  custom_arrangement: { ar: "تنسيق من المنسق", en: "Prepared by Coordinator" },
  other: { ar: "أخرى", en: "Other" },
  unknown: { ar: "غير محدد", en: "Not specified" },
} as const satisfies Record<string, Bilingual>;

export const FULFILLMENT = {
  pickup: { ar: "استلام من المحل", en: "Pickup" },
  delivery: { ar: "توصيل", en: "Delivery" },
  unknown: { ar: "غير محدد", en: "Not specified" },
} as const satisfies Record<string, Bilingual>;

export const PAYMENT_METHODS = {
  cash: { ar: "كاش", en: "Cash" },
  card: { ar: "شبكة", en: "Card" },
} as const satisfies Record<string, Bilingual>;

/**
 * Delivery areas and what the customer pays to each, as on the website (Khamis Mushait's
 * shop). The orders system pays the rep by the same area names.
 */
export const AREAS: { name: string; fee: number }[] = [
  { name: "خميس مشيط", fee: 25 },
  { name: "أبها", fee: 25 },
  { name: "تندحه - أحد رفيدة", fee: 25 },
  { name: "الفرعاء - الواديين", fee: 50 },
  { name: "وادي بن هشبل", fee: 50 },
];

/** Delivery periods, as in the orders system. */
export const SLOTS = {
  morning: { ar: "9–12 الصبح", en: "9 AM – 12 PM" },
  afternoon: { ar: "2–7 العصر", en: "2 – 7 PM" },
  evening: { ar: "7–11 الليل", en: "7 – 11 PM" },
} as const satisfies Record<string, Bilingual>;

/** A delivery sale's details, sent to the orders system (the rep and the supervisor). */
export type Delivery = { area: string; date: string; slot: keyof typeof SLOTS | null; card_message: string | null; recipient_phone: string | null };

export type OrderType = keyof typeof ORDER_TYPES;
export type Fulfillment = keyof typeof FULFILLMENT;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const T = {
  appName: { ar: "مبيعات المحل", en: "Shop Sales" },
  login: { ar: "تسجيل الدخول", en: "Login" },
  logout: { ar: "خروج", en: "Logout" },
  phone: { ar: "رقم الجوال", en: "Mobile Number" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  staff: { ar: "موظف", en: "Staff" },
  manager: { ar: "مدير", en: "Manager" },
  password: { ar: "كلمة المرور", en: "Password" },
  newSale: { ar: "عملية جديدة", en: "New Sale" },
  orderType: { ar: "نوع الطلب", en: "Order Type" },
  fulfillment: { ar: "طريقة الاستلام", en: "Pickup / Delivery" },
  paymentMethod: { ar: "طريقة الدفع", en: "Payment Method" },
  amount: { ar: "المبلغ (ريال)", en: "Amount (SAR)" },
  customerName: { ar: "اسم العميل (اختياري)", en: "Customer Name (optional)" },
  customerPhone: { ar: "جوال العميل (اختياري)", en: "Customer Phone (optional)" },
  notes: { ar: "ملاحظات (اختياري)", en: "Notes (optional)" },
  withGift: { ar: "مع هدية؟", en: "With a gift?" },
  yes: { ar: "نعم", en: "Yes" },
  no: { ar: "لا", en: "No" },
  giftName: { ar: "نوع الهدية (مثلاً: سلسال)", en: "Gift (e.g. necklace)" },
  giftAmount: { ar: "سعر الهدية (ريال)", en: "Gift Price (SAR)" },
  flowersAmount: { ar: "سعر الطلب بدون الهدية (ريال)", en: "Order Price without Gift (SAR)" },
  gifts: { ar: "الهدايا", en: "Gifts" },
  gift: { ar: "هدية", en: "Gift" },
  notesRequired: { ar: "ملاحظات: اكتب وش الطلب", en: "Notes: describe the order" },
  print: { ar: "طباعة", en: "Print" },
  saleDate: { ar: "تاريخ العملية", en: "Sale Date" },
  pastDateNote: { ar: "تاريخ سابق: ما يرسل تنبيه تيليجرام", en: "Past date: no Telegram alert" },
  date: { ar: "التاريخ", en: "Date" },
  dailyBreakdown: { ar: "تقرير كل يوم", en: "Day by Day" },
  monthTotal: { ar: "إجمالي الشهر", en: "Month Total" },
  loading: { ar: "جاري التحميل…", en: "Loading…" },
  save: { ar: "حفظ", en: "Save" },
  saved: { ar: "تم الحفظ ✓", en: "Saved ✓" },
  mySalesToday: { ar: "عملياتي اليوم", en: "My Sales Today" },
  dailyReport: { ar: "التقرير اليومي", en: "Daily Report" },
  monthlyReport: { ar: "التقرير الشهري", en: "Monthly Report" },
  total: { ar: "الإجمالي", en: "Total" },
  count: { ar: "عدد العمليات", en: "Transactions" },
  employee: { ar: "الموظف", en: "Employee" },
  time: { ar: "الوقت", en: "Time" },
  day: { ar: "اليوم", en: "Day" },
  byEmployee: { ar: "حسب الموظف", en: "By Employee" },
  byOrderType: { ar: "حسب نوع الطلب", en: "By Order Type" },
  byFulfillment: { ar: "حسب الاستلام", en: "By Pickup / Delivery" },
  byDay: { ar: "حسب اليوم", en: "By Day" },
  transactions: { ar: "العمليات", en: "Transactions" },
  noSales: { ar: "لا توجد عمليات", en: "No sales" },
  exportExcel: { ar: "تصدير Excel", en: "Export Excel" },
  delete: { ar: "حذف", en: "Delete" },
  confirmDelete: { ar: "متأكد من حذف العملية؟", en: "Delete this sale?" },
  show: { ar: "عرض", en: "Show" },
  live: { ar: "مباشر", en: "Live" },
  delivery: { ar: "التوصيل", en: "Delivery" },
  deliveryNote: { ar: "يروح للمشرف (إبراهيم) على طول ويسنده لمندوب", en: "Goes straight to the supervisor for a rep" },
  area: { ar: "المنطقة", en: "Area" },
  deliveryFee: { ar: "مبلغ التوصيل (ريال)", en: "Delivery Fee (SAR)" },
  deliveryDay: { ar: "يوم التوصيل", en: "Delivery Day" },
  slot: { ar: "الفترة", en: "Period" },
  anyTime: { ar: "أي وقت", en: "Any time" },
  recipientPhone: { ar: "جوال المستلم (اختياري)", en: "Recipient Phone (optional)" },
  cardMessage: { ar: "العبارة (اختياري)", en: "Card Message (optional)" },
  orderPhoto: { ar: "صورة الطلب (اختياري)", en: "Order Photo (optional)" },
  orderAmount: { ar: "سعر الطلب بدون التوصيل (ريال)", en: "Order Price without Delivery (SAR)" },
  sentToRep: { ar: "وصل للمشرف", en: "Sent to supervisor" },
  notSent: { ar: "ما وصل للمشرف", en: "Not sent" },
  resend: { ar: "إعادة الإرسال", en: "Send again" },
  needPhone: { ar: "اكتب جوال العميل أو المستلم عشان المندوب يتصل", en: "Add the customer's or recipient's mobile for the rep" },
} as const satisfies Record<string, Bilingual>;

export const bi = (l: Bilingual) => `${l.ar} / ${l.en}`;
