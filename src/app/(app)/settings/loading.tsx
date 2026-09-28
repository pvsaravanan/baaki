import { Skeleton } from "@/components/ui/misc";

/** Mirrors SettingsView: a section index on desktop, then titled cards of rows. */
export default function SettingsLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-md border-b border-border pb-md">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <div className="hidden flex-col gap-3 border-l border-border pl-4 lg:flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-10">
          {[3, 2, 6, 3].map((rows, s) => (
            <div key={s}>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-2 h-4 w-60" />
              <div className="mt-3 divide-y divide-border rounded-md border border-border bg-surface">
                {Array.from({ length: rows }).map((_, r) => (
                  <div key={r} className="flex items-center justify-between gap-4 p-5">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
