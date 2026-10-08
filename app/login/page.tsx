"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bi } from "@/components/ui";
import { T } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";

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
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setLoading(false);
    if (error) {
      setError("بيانات الدخول غير صحيحة / Wrong email or password");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <h1 className="text-center text-2xl font-bold text-pink-700">
          🌸 <Bi l={T.appName} />
        </h1>
        <label className="block">
          <Bi l={T.email} className="mb-1 text-sm font-semibold" />
          <input name="email" type="email" required dir="ltr" className="w-full rounded-lg border p-3" />
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
