"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkOnboardingReady } from "@/lib/actions/onboarding";

export function OnboardingWait() {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      // poll up to ~3s (8 attempts x 400ms)
      for (let i = 0; i < 8; i += 1) {
        if (cancelled) return;
        setAttempt(i + 1);
        try {
          const res = await checkOnboardingReady();
          if (res.ready) {
            router.refresh();
            return;
          }
        } catch {
          // ignore and retry
        }
        await new Promise<void>((r) => setTimeout(r, 400));
      }
      if (!cancelled) setTimedOut(true);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (timedOut) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-16">
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-6">
          <h1 className="text-lg font-semibold text-text-primary">
            Still setting up your account
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Your account is taking longer than expected to set up. This can
            happen if the webhook is delayed.
          </p>
          <button
            type="button"
            onClick={() => {
              setTimedOut(false);
              setAttempt(0);
              router.refresh();
            }}
            className="mt-4 rounded-full bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-light"
          >
            Continue
          </button>
          <p className="mt-3 text-xs text-text-muted">Attempt {attempt}/8</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-sm font-medium text-text-primary">
          Setting up your account…
        </p>
        <p className="mt-1 text-sm text-text-muted">
          This usually takes a second. Hang tight.
        </p>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-border">
          <div className="h-full w-1/2 animate-pulse bg-accent-primary" />
        </div>
        <p className="mt-2 text-xs text-text-muted">Attempt {attempt}/8</p>
      </div>
    </div>
  );
}
