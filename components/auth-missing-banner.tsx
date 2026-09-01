"use client";

export function AuthMissingBanner() {
  return (
    <div className="w-full bg-warning/20 px-4 py-2 text-center text-xs font-medium text-text-primary">
      Clerk not configured — auth is disabled in dev. Set{" "}
      <code className="rounded bg-surface px-1 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>{" "}
      and <code className="rounded bg-surface px-1 py-0.5">CLERK_SECRET_KEY</code> to
      enable sign-in.
    </div>
  );
}
