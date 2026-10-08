import { Nav } from "@/components/ui";
import { requireProfile } from "@/lib/supabase/server";

// The header stays on screen while switching tabs; only the page below it reloads.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  return (
    <>
      <Nav profile={profile} />
      {children}
    </>
  );
}
