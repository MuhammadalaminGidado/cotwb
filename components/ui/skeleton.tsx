export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={["animate-pulse motion-reduce:animate-none rounded bg-skeleton", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={i === lines - 1 ? "h-4 w-3/5" : "h-4 w-full"} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 40, className }: { size?: number; className?: string }) {
  return <Skeleton className={["rounded-full", className].filter(Boolean).join(" ")} style={{ width: size, height: size }} />;
}
