"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { bi } from "@/lib/labels";
import { BRANCHES } from "@/lib/orders";
import { ASSIGNABLE_ROLES, ROLES, SL, needsBranch, type Role } from "@/lib/roles";
import { Bi } from "./bi";


async function send(method: "POST" | "PATCH", body: object): Promise<string | null> {
  const res = await fetch("/api/staff", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.ok ? null : ((await res.json().catch(() => ({}))).error ?? "Error");
}

function RoleBranch({ role, branch, onRole, onBranch }: { role: string; branch: string; onRole: (r: string) => void; onBranch: (b: string) => void }) {
  return (
    <>
      <select value={role} onChange={(e) => onRole(e.target.value)} required className="w-full rounded-md border border-line bg-white p-3">
        <option value="">{bi(SL.role)}</option>
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {bi(ROLES[r])}
          </option>
        ))}
      </select>
      {role && needsBranch(role as Role) && (
        <select value={branch} onChange={(e) => onBranch(e.target.value)} required className="w-full rounded-md border border-line bg-white p-3">
          <option value="">{bi(SL.branch)}</option>
          {Object.entries(BRANCHES).map(([k, l]) => (
            <option key={k} value={k}>
              {bi(l)}
            </option>
          ))}
        </select>
      )}
    </>
  );
}

export function AddStaff() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    const error = await send("POST", { full_name: f.get("full_name"), mobile: f.get("mobile"), password: f.get("password"), role, branch });
    setBusy(false);
    setMsg(error ? { ok: false, text: error } : { ok: true, text: bi(SL.added) });
    if (!error) {
      form.reset();
      setRole("");
      setBranch("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <input name="full_name" required maxLength={80} placeholder={bi(SL.name)} className="w-full rounded-md border p-3" />
      <input name="mobile" required type="tel" inputMode="tel" placeholder="05XXXXXXXX" dir="ltr" className="w-full rounded-md border p-3" />
      <input name="password" required minLength={6} placeholder={bi(SL.password)} dir="ltr" className="w-full rounded-md border p-3" />
      <RoleBranch role={role} branch={branch} onRole={setRole} onBranch={setBranch} />
      <button disabled={busy} className="rounded-md bg-ink px-4 py-3 font-medium text-white disabled:opacity-50 sm:col-span-2">
        <Bi l={SL.add} />
      </button>
      {msg && <p className={`text-sm sm:col-span-2 ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
    </form>
  );
}

/** Per-person controls: stop / activate, new password, role and branch. */
export function StaffControls({ id, active, role, branch }: { id: string; active: boolean; role: string; branch: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newRole, setNewRole] = useState(role);
  const [newBranch, setNewBranch] = useState(branch ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function act(body: object, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setError("");
    const err = await send("PATCH", { id, ...body });
    if (err) setError(err);
    else {
      setPassword("");
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button onClick={() => setOpen(!open)} className="rounded-sm border border-line px-3 py-1.5 text-sm hover:bg-sand">
          <Bi l={SL.change} />
        </button>
        <button
          onClick={() => act({ action: active ? "stop" : "start" }, active ? `${bi(SL.stop)}؟` : undefined)}
          className={`rounded-sm border px-3 py-1.5 text-sm ${active ? "border-line text-red-700 hover:bg-red-50" : "border-ink bg-ink text-white"}`}
        >
          <Bi l={active ? SL.stop : SL.start} />
        </button>
      </div>
      {open && (
        <div className="space-y-2 rounded-md border border-line bg-paper p-3">
          <RoleBranch role={newRole} branch={newBranch} onRole={setNewRole} onBranch={setNewBranch} />
          <button onClick={() => act({ action: "role", role: newRole, branch: newBranch })} className="w-full rounded-md bg-ink px-3 py-2 text-sm text-white">
            <Bi l={SL.save} />
          </button>
          <div className="flex gap-2 border-t border-line pt-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} placeholder={bi(SL.newPassword)} dir="ltr" className="flex-1 rounded-md border p-2" />
            <button onClick={() => act({ action: "password", password })} disabled={password.length < 6} className="rounded-md border border-ink px-3 text-sm disabled:opacity-40">
              <Bi l={SL.save} />
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
