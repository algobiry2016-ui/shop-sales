// Every label in the app is shown in Arabic and English together.

export type Bilingual = { ar: string; en: string };

export const ORDER_TYPES = {
  ready_made: { ar: "جاهز", en: "Ready-made" },
  custom_arrangement: { ar: "تنسيق من المنسق", en: "Prepared by Coordinator" },
  other: { ar: "أخرى", en: "Other" },
} as const satisfies Record<string, Bilingual>;

export const FULFILLMENT = {
  pickup: { ar: "استلام من المحل", en: "Pickup" },
  delivery: { ar: "توصيل", en: "Delivery" },
} as const satisfies Record<string, Bilingual>;

export const PAYMENT_METHODS = {
  cash: { ar: "كاش", en: "Cash" },
  card: { ar: "شبكة", en: "Card" },
} as const satisfies Record<string, Bilingual>;

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
  phoneRequired: { ar: "جوال العميل (مطلوب للتوصيل)", en: "Customer Phone (required for delivery)" },
  print: { ar: "طباعة", en: "Print" },
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
} as const satisfies Record<string, Bilingual>;

export const bi = (l: Bilingual) => `${l.ar} / ${l.en}`;
