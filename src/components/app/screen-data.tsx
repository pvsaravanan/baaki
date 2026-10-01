"use client";
import { Skeleton } from "@/components/ui/misc";

/**
 * Renders a screen once its on-device data has loaded (see usePageData):
 * the skeleton until then, or a short message if it couldn't be read.
 */
export function ScreenData<T>({
  data,
  error,
  skeleton = <ListSkeleton />,
  children,
}: {
  data: T | undefined;
  error?: Error;
  skeleton?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}) {
  if (data !== undefined) return <>{children(data)}</>;
  if (error) {
    return (
      <p className="border border-border bg-surface p-4 text-sm text-muted">
        This screen couldn&apos;t be loaded. Go back and try again.
      </p>
    );
  }
  return <>{skeleton}</>;
}

/** Generic list placeholder. */
export function ListSkeleton() {
  return (
    <div className="space-y-3 rounded-none border border-border bg-surface p-4 animate-fade-in">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
