// Who does what. Shared by server and client code (no server-only imports here).

export type Role = "employee" | "admin" | "site_manager" | "supervisor" | "florist" | "rep";
export type Profile = { id: string; full_name: string; role: Role; branch: "riyadh" | "khamis" | null };

/** Shop sales are recorded by the shop coordinators and the managers; everyone else works on website orders. */
export const recordsSales = (p: Profile) => p.role === "employee" || p.role === "admin";
export const homeOf = (p: Profile) => (p.role === "admin" ? "/reports/daily" : recordsSales(p) ? "/sale" : "/orders");

export const ROLES = {
  site_manager: { ar: "مسؤول الموقع", en: "Website Manager" },
  supervisor: { ar: "مشرف", en: "Supervisor" },
  florist: { ar: "منسق الموقع", en: "Website Florist" },
  rep: { ar: "مندوب", en: "Delivery Rep" },
  employee: { ar: "منسق المحل", en: "Shop Coordinator" },
  admin: { ar: "إدارة", en: "Management" },
} as const satisfies Record<Role, { ar: string; en: string }>;

/** Roles a manager can give from the staff screen. Management accounts are added in Supabase only. */
export const ASSIGNABLE_ROLES = ["site_manager", "supervisor", "florist", "rep", "employee"] as const;

/** Every role except management and shop coordinators works in one branch. */
export const needsBranch = (role: Role) => role !== "admin" && role !== "employee";

/** Staff log in with their mobile number, stored as an account email: 05XXXXXXXX → 9665XXXXXXXX@shop.com. */
export function loginEmail(mobile: string): string | null {
  const d = mobile.replace(/\D/g, "").replace(/^00/, "").replace(/^966/, "").replace(/^0/, "");
  return /^5\d{8}$/.test(d) ? `966${d}@shop.com` : null;
}

/** 9665XXXXXXXX@shop.com → 05XXXXXXXX (for showing in the staff list). */
export const mobileOf = (email: string | null | undefined) => (email && /^9665\d{8}@shop\.com$/.test(email) ? `0${email.slice(3, 12)}` : null);

/** Staff screen labels. */
export const SL = {
  staff: { ar: "الموظفين", en: "Staff" },
  add: { ar: "إضافة موظف", en: "Add Staff" },
  name: { ar: "الاسم", en: "Name" },
  mobile: { ar: "الجوال (للدخول)", en: "Mobile (login)" },
  password: { ar: "كلمة المرور", en: "Password" },
  role: { ar: "الدور", en: "Role" },
  branch: { ar: "الفرع", en: "Branch" },
  save: { ar: "حفظ", en: "Save" },
  stop: { ar: "إيقاف", en: "Stop" },
  start: { ar: "تفعيل", en: "Activate" },
  stopped: { ar: "موقوف", en: "Stopped" },
  newPassword: { ar: "كلمة مرور جديدة", en: "New Password" },
  change: { ar: "تعديل", en: "Edit" },
  added: { ar: "تمت الإضافة ✓ يقدر يدخل الآن بجواله وكلمة المرور", en: "Added ✓ They can log in now" },
} as const;
