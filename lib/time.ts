// The shop runs on Saudi time (UTC+3, no daylight saving).
const OFFSET = "+03:00";
const TZ = "Asia/Riyadh";

const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** YYYY-MM-DD in Riyadh time. */
export function localDate(d: Date | string = new Date()): string {
  return dateFmt.format(new Date(d));
}

/** YYYY-MM in Riyadh time. */
export function localMonth(d: Date | string = new Date()): string {
  return localDate(d).slice(0, 7);
}

export function localTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

/** [start, end) ISO timestamps covering one local day. */
export function dayRange(date: string): [string, string] {
  const start = new Date(`${date}T00:00:00${OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return [start.toISOString(), end.toISOString()];
}

/** [start, end) ISO timestamps covering one local month. */
export function monthRange(month: string): [string, string] {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return [new Date(`${month}-01T00:00:00${OFFSET}`).toISOString(), new Date(`${next}-01T00:00:00${OFFSET}`).toISOString()];
}

export const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const isMonth = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}$/.test(s);

/** Weekday name of a YYYY-MM-DD date, e.g. { ar: "الأحد", en: "Sun" }. */
export function weekday(date: string): { ar: string; en: string } {
  const d = new Date(`${date}T12:00:00Z`);
  return {
    ar: d.toLocaleDateString("ar-SA", { weekday: "long", timeZone: "UTC" }),
    en: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
  };
}

/** Every date of a month up to today (all of it for past months). */
export function daysOfMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = localDate();
  const days: string[] = [];
  for (let d = 1; d <= last; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    if (date > today) break;
    days.push(date);
  }
  return days;
}
