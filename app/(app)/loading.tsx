import { Bi } from "@/components/bi";
import { T } from "@/lib/labels";

// Shown instantly when a tab is tapped, until the page's data arrives.
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-3 sm:p-4">
      <div className="animate-pulse space-y-4">
        <div className="h-36 rounded-md border border-line bg-white" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-48 rounded-md border border-line bg-white" />
          <div className="h-48 rounded-md border border-line bg-white" />
        </div>
      </div>
      <p className="text-center text-sm text-muted">
        <Bi l={T.loading} />
      </p>
    </main>
  );
}
