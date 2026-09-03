import { Skeleton, SkeletonText, SkeletonAvatar } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-bg px-6 py-16" aria-busy="true" aria-live="polite">
      <div className="flex w-full max-w-2xl flex-col gap-8 rounded-xl border border-border bg-surface p-8">
        <div>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="mt-2 h-3 w-12" />
        </div>
        <SkeletonText lines={2} />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-bg p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-3 w-12" />
          </div>
          <div className="rounded-lg border border-border bg-bg p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
