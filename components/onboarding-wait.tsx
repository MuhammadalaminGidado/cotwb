"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkOnboardingReady } from "@/lib/actions/onboarding";

export function OnboardingWait() {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  async function poll() {
    setTimedOut(false);
    for (let i = 0; i < 24; i += 1) {
      try {
        const res = await checkOnboardingReady();
        if (res.ready) {
          router.refresh();
          return true;
        }
      } catch {
        // ignore and retry
      }
      await new Promise<void>((r) => setTimeout(r, 500));
    }
    setTimedOut(true);
    return false;
  }

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) void poll();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (timedOut) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-16">
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">
            Taking a little longer than usual. Please refresh the page.
          </p>
          <p className="mt-1 text-xs text-text-muted">
            If this persists, check that CLERK_WEBHOOK_SECRET is configured.
          </p>
          <button
            type="button"
            onClick={() => {
              void poll();
            }}
            className="mt-4 rounded-full bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent-primary" />
          <p className="text-sm text-text-muted">Getting your account ready…</p>
        </div>
      </div>
    </div>
  );
}
