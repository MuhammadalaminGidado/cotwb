"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkOnboardingReady } from "@/lib/actions/onboarding";

export function OnboardingWait() {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      for (let i = 0; i < 8; i += 1) {
        if (cancelled) return;
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
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-text-muted">
            Taking a little longer than usual. Please refresh the page.
          </p>
          <button
            type="button"
            onClick={() => router.refresh()}
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
