import { Skeleton } from "@/components/ui/misc";

/** Stand-in for the dashboard while it loads; `header={false}` when the real header is already showing. */
export function DashboardSkeleton({ header = true }: { header?: boolean }) {
  return (
    <div className="space-y-4">
      {/* The greeting; the month picker lives in the top bar. */}
      {header && <Skeleton className="h-24 w-full" />}
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-52 w-full" />
    </div>
  );
}
