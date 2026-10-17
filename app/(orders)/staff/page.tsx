import { AddStaff, StaffControls } from "@/components/staff";
import { Bi, Card } from "@/components/ui";
import { BRANCHES } from "@/lib/orders";
import { ROLES, SL, mobileOf, type Role } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

const ORDER: Role[] = ["admin", "site_manager", "supervisor", "florist", "rep", "employee"];

// Managers add and manage the people who use the system, without opening Supabase.
export default async function StaffPage() {
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: staff }, { data: users }] = await Promise.all([
    db ? db.from("shop_staff").select("id, full_name, role, branch, active").order("full_name") : Promise.resolve({ data: [] }),
    db ? db.auth.admin.listUsers({ perPage: 1000 }) : Promise.resolve({ data: { users: [] } }),
  ]);
  const emailOf = new Map((users?.users ?? []).map((u) => [u.id, u.email]));
  // Stopped either here or banned directly in Supabase (as Riyadh and Sajeeb were).
  const banned = new Set((users?.users ?? []).filter((u) => u.banned_until && new Date(u.banned_until) > new Date()).map((u) => u.id));
  const isActive = (p: { id: string; active: boolean }) => p.active && !banned.has(p.id);
  const people = (staff ?? []).sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role) || (a.branch ?? "").localeCompare(b.branch ?? ""));

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-3 sm:p-4">
      <h1 className="text-xl font-semibold">
        <Bi l={SL.staff} />
      </h1>
      <Card>
        <h2 className="mb-3 font-semibold">
          <Bi l={SL.add} />
        </h2>
        <AddStaff />
      </Card>
      <Card className="divide-y divide-line !p-0">
        {people.map((p) => (
          <div key={p.id} className={`flex flex-wrap items-start gap-3 p-3 ${isActive(p) ? "" : "bg-sand/60"}`}>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {p.full_name}
                {!isActive(p) && <span className="ms-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">{SL.stopped.ar}</span>}
              </p>
              <p className="text-sm text-muted">
                {ROLES[p.role as Role]?.ar ?? p.role}
                {p.branch && ` · ${BRANCHES[p.branch as keyof typeof BRANCHES].ar}`}
                {" · "}
                <span dir="ltr">{mobileOf(emailOf.get(p.id)) ?? emailOf.get(p.id) ?? ""}</span>
              </p>
            </div>
            {p.role !== "admin" && <StaffControls id={p.id} active={isActive(p)} role={p.role} branch={p.branch} />}
          </div>
        ))}
      </Card>
    </main>
  );
}
