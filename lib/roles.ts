// Who does what. Shared by server and client code (no server-only imports here).

export type Role = "employee" | "admin" | "site_manager" | "supervisor" | "florist" | "rep";
export type Profile = { id: string; full_name: string; role: Role; branch: "riyadh" | "khamis" | null };

/** Shop sales are recorded by the shop coordinators and the managers; everyone else works on website orders. */
export const recordsSales = (p: Profile) => p.role === "employee" || p.role === "admin";
export const homeOf = (p: Profile) => (p.role === "admin" ? "/reports/daily" : recordsSales(p) ? "/sale" : "/orders");
