"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { becomeWriter } from "@/lib/actions/writer";
import { checkOnboardingReady } from "@/lib/actions/onboarding";

type Props = {
  initialIsWriter: boolean | null; // null = user row not yet ready
};

export function OnboardingClient({ initialIsWriter }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") ?? "/";

  const [isWriter, setIsWriter] = useState(initialIsWriter);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // webhook race: user row not ready yet — poll
  if (isWriter === null) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-sm font-medium text-text-primary">
          Setting up your account…
        </p>
        <p className="mt-1 text-sm text-text-muted">
          This usually takes a second.
        </p>
        <button
          type="button"
          disabled={checking}
          onClick={async () => {
            setChecking(true);
            setError(null);
            try {
              const res = await checkOnboardingReady();
              if (res.ready) {
                router.refresh();
              } else {
                setError("Still setting up — try again in a moment.");
              }
            } catch {
              setError("Could not check status. Try again.");
            } finally {
              setChecking(false);
            }
          }}
          className="mt-4 rounded-full bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse disabled:opacity-50"
        >
          {checking ? "Checking…" : "Continue"}
        </button>
        {error ? (
          <p className="mt-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (isWriter) {
    // Already a writer (e.g. re-visiting onboarding)
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-6">
        <p className="text-sm font-medium text-text-primary">
          You are already a writer
        </p>
        <button
          type="button"
          onClick={() => router.push(redirectUrl)}
          className="mt-3 rounded-full bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse"
        >
          Go to {redirectUrl === "/" ? "home" : redirectUrl}
        </button>
      </div>
    );
  }

  function handleBecomeWriter() {
    setError(null);
    startTransition(async () => {
      const res = await becomeWriter();
      if (res.success) {
        router.push(redirectUrl);
      } else {
        setError(res.error);
      }
    });
  }

  function handleSkip() {
    router.push(redirectUrl);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-text-primary">
          How do you want to get started?
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          You can read pieces either way. If you want to write and publish
          pieces, choose below — you can always enable it later in settings.
        </p>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={handleBecomeWriter}
            disabled={isPending}
            className="rounded-xl border border-accent-primary bg-accent-primary px-5 py-3 text-left text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-light disabled:opacity-50"
          >
            <span className="block font-semibold">I want to write too</span>
            <span className="mt-1 block text-xs font-normal opacity-90">
              Enable writer status so you can create drafts and submit for review.
            </span>
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isPending}
            className="rounded-xl border border-border bg-surface px-5 py-3 text-left text-sm font-medium text-text-primary transition-colors hover:bg-bg disabled:opacity-50"
          >
            <span className="block font-semibold">Just reading</span>
            <span className="mt-1 block text-xs font-normal text-text-muted">
              Skip for now — you can enable writing later in settings.
            </span>
          </button>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
