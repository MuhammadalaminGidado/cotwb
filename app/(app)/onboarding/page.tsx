import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
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
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary">
        <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden="true" /> Back
      </Link>
      <h1 className="mt-3 font-serif text-2xl font-semibold text-text-primary">Welcome</h1>
      <p className="mt-2 text-sm text-text-muted">
        Choose how you want to use COTWB and set your mailing preference. You
        can change both later in settings.
      </p>
      <div className="mt-6">
        <OnboardingClient
          initialIsWriter={user ? user.isWriter : null}
          initialDigestEnabled={user ? user.digestEnabled : true}
          initialDigestFrequency={user ? user.digestFrequency : "weekly"}
        />
      </div>
    </div>
  );
}
