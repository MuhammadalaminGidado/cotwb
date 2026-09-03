import { hasClerk } from "@/lib/clerk-config";
import { currentUser } from "@/lib/auth";
import { OnboardingClient } from "@/components/onboarding-client";

export default async function OnboardingPage() {
  if (!hasClerk()) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-16">
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-6">
          <h1 className="text-lg font-semibold text-text-primary">
            Auth not configured
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Onboarding requires Clerk. Set Clerk keys in{" "}
            <code className="rounded bg-surface px-1 py-0.5">.env.local</code>.
          </p>
        </div>
      </div>
    );
  }

  const user = await currentUser();

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-8">
      <h1 className="font-serif text-2xl font-semibold text-text-primary">
        Welcome
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        One quick choice to get you started.
      </p>
      <div className="mt-6">
        <OnboardingClient initialIsWriter={user ? user.isWriter : null} />
      </div>
    </div>
  );
}
