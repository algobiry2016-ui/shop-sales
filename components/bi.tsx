import type { Bilingual } from "@/lib/labels";

/** Arabic on top, English underneath. `display` sets the English in the brand serif. */
export function Bi({ l, className = "", display = false }: { l: Bilingual; className?: string; display?: boolean }) {
  return (
    <span className={`inline-flex flex-col leading-tight ${className}`}>
      <span>{l.ar}</span>
      <span className={display ? "mt-0.5 font-display text-[0.6em] font-normal uppercase tracking-[0.2em] opacity-70" : "text-[0.75em] font-normal opacity-60"} dir="ltr">
        {l.en}
      </span>
    </span>
  );
}
