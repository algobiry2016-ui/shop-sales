"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bi } from "@/components/ui";
import { T } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";

/**
 * Staff log in with their mobile number; it maps to an account email like 966501234567@shop.com.
 * Anything containing "@" is used as an email as-is.
 */
function toLoginEmail(input: string): string {
  const value = input.trim();
  if (value.includes("@")) return value;
  let digits = value.replace(/\D/g, "").replace(/^00/, "");
  if (digits.startsWith("05")) digits = "966" + digits.slice(1);
  else if (digits.length === 9 && digits.startsWith("5")) digits = "966" + digits;
  return `${digits}@shop.com`;
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Staff (Riyadh, Sajeeb) use their mobile number; managers use their email.
  const [mode, setMode] = useState<"staff" | "manager">("staff");

  useEffect(() => {
    try {
      if (localStorage.getItem("loginMode") === "manager") setMode("manager");
    } catch {}
  }, []);

  function pick(m: "staff" | "manager") {
    setMode(m);
    setError("");
    try {
      localStorage.setItem("loginMode", m);
    } catch {}
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.signInWithPassword({
      email: toLoginEmail(String(form.get("login"))),
      password: String(form.get("password")),
    });
    setLoading(false);
    if (error) {
      setError(mode === "staff" ? "رقم الجوال أو كلمة المرور غير صحيحة / Wrong mobile number or password" : "الإيميل أو كلمة المرور غير صحيحة / Wrong email or password");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-md border border-line bg-white p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Logo" className="mx-auto h-24 w-auto" />
        <h1 className="border-b border-line pb-5 text-center text-lg font-medium">
          <Bi l={T.appName} display />
        </h1>
        <div className="grid grid-cols-2 gap-1 rounded-md border border-line p-1 text-sm">
          {(["staff", "manager"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => pick(m)}
              className={`rounded-sm py-2 transition ${mode === m ? "bg-ink text-white" : "hover:bg-sand"}`}
            >
              <Bi l={T[m]} />
            </button>
          ))}
        </div>
        <label className="block">
          <Bi l={mode === "staff" ? T.phone : T.email} className="mb-1.5 text-sm font-medium" />
          {mode === "staff" ? (
            <input key="staff" name="login" type="tel" inputMode="tel" autoComplete="username" placeholder="05xxxxxxxx" required dir="ltr" className="w-full rounded-md border p-3" />
          ) : (
            <input key="manager" name="login" type="email" inputMode="email" autoComplete="username" placeholder="name@example.com" required dir="ltr" className="w-full rounded-md border p-3" />
          )}
        </label>
        <label className="block">
          <Bi l={T.password} className="mb-1.5 text-sm font-medium" />
          <input name="password" type="password" required dir="ltr" className="w-full rounded-md border p-3" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-md bg-ink p-3 font-semibold text-white transition hover:bg-black disabled:opacity-50">
          <Bi l={T.login} />
        </button>
      </form>
    </main>
  );
}
