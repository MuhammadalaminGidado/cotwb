import { currentUser } from "@/lib/auth";
import { hasClerk } from "@/lib/clerk-config";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasClerk()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-6">
          <h1 className="text-lg font-semibold text-text-primary">Auth not configured</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Protected pages require Clerk. Set{" "}
            <code className="rounded bg-surface px-1 py-0.5">
              NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
            </code>{" "}
            and <code className="rounded bg-surface px-1 py-0.5">CLERK_SECRET_KEY</code> in
            your <code>.env.local</code>.
          </p>
        </div>
      </div>
    );
  }

  // Auth is configured — require session
  const { auth } = await import("@clerk/nextjs/server");
  await auth.protect();

  const user = await currentUser();
  if (!user) {
    // If we're on /onboarding, show the full onboarding UI immediately so the
    // reader/writer choice is visible without 12s. For other protected routes,
    // keep the lightweight polling spinner.
    const { headers } = await import("next/headers");
    const hdrs = await headers();
    const pathname = hdrs.get("x-pathname") ?? "";
    if (pathname.startsWith("/onboarding")) {
      return <>{children}</>;
    }
    const { OnboardingWait } = await import("@/components/onboarding-wait");
    return <OnboardingWait />;
  }
  return <>{children}</>;
}
