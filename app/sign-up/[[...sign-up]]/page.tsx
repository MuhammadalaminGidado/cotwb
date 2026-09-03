import { hasClerk } from "@/lib/clerk-config";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = params?.redirect_url ?? "/onboarding";

  if (!hasClerk()) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-16">
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-6">
          <h1 className="text-lg font-semibold text-text-primary">Auth not configured</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Clerk keys are not set. Add{" "}
            <code className="rounded bg-surface px-1 py-0.5">
              NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
            </code>{" "}
            and <code className="rounded bg-surface px-1 py-0.5">CLERK_SECRET_KEY</code> to
            your <code>.env.local</code> and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  const [{ SignUp }, { clerkAppearance }] = await Promise.all([
    import("@clerk/nextjs"),
    import("@/theme/clerk-appearance"),
  ]);
  return (
    <div className="flex flex-1 items-center justify-center bg-bg px-6 py-16">
      <SignUp
        appearance={clerkAppearance}
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl}
      />
    </div>
  );
}
