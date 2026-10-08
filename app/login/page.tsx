"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
      setError("بيانات الدخول غير صحيحة / Wrong phone or password");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Logo" className="mx-auto h-24 w-auto" />
        <h1 className="text-center text-xl font-bold text-pink-700">
          <Bi l={T.appName} />
        </h1>
        <label className="block">
          <Bi l={T.phone} className="mb-1 text-sm font-semibold" />
          <input name="login" type="text" inputMode="tel" autoComplete="username" placeholder="05xxxxxxxx" required dir="ltr" className="w-full rounded-lg border p-3" />
        </label>
        <label className="block">
          <Bi l={T.password} className="mb-1 text-sm font-semibold" />
          <input name="password" type="password" required dir="ltr" className="w-full rounded-lg border p-3" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-pink-700 p-3 font-bold text-white disabled:opacity-50">
          <Bi l={T.login} />
        </button>
      </form>
    </main>
  );
}
