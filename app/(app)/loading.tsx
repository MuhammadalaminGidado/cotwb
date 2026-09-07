import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8" aria-busy="true" aria-live="polite">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-border bg-surface p-6">
          <Skeleton className="h-5 w-32" />
          <SkeletonText lines={3} className="mt-4" />
          <Skeleton className="mt-4 h-10 w-36 rounded-full" />
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <Skeleton className="h-5 w-40" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
