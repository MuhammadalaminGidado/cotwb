import { hasClerk } from "@/lib/clerk-config";

export default async function SignInPage() {
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
          <p className="mt-3 text-xs text-text-muted">
            Run <code className="rounded bg-surface px-1 py-0.5">npx clerk@latest init</code>{" "}
            or copy keys from https://dashboard.clerk.com/last-active?path=api-keys
          </p>
        </div>
      </div>
    );
  }

  const { SignIn } = await import("@clerk/nextjs");
  return (
    <div className="flex flex-1 items-center justify-center bg-bg px-6 py-16">
      <SignIn />
    </div>
  );
}
