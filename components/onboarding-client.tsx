"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { checkOnboardingReady } from "@/lib/actions/onboarding";
import { getSafeRedirect } from "@/lib/redirect";

type Props = {
  initialIsWriter: boolean | null; // null = account still syncing
  initialDigestEnabled: boolean;
  initialDigestFrequency: "weekly" | "never";
};

export function OnboardingClient({
  initialIsWriter,
  initialDigestEnabled,
  initialDigestFrequency,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = getSafeRedirect(searchParams.get("redirect_url"), "/");

  const [isWriter, setIsWriter] = useState(initialIsWriter);
  const [readyError, setReadyError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [role, setRole] = useState<"reader" | "writer">(
    initialIsWriter ? "writer" : "reader",
  );
  const [digestEnabled, setDigestEnabled] = useState(initialDigestEnabled);

  // Keep client state in sync with server prop after router.refresh()
  useEffect(() => {
    setIsWriter(initialIsWriter);
    if (initialIsWriter !== null) {
      setRole(initialIsWriter ? "writer" : "reader");
    }
    setDigestEnabled(initialDigestEnabled);
  }, [initialIsWriter, initialDigestEnabled, initialDigestFrequency]);

  const pollReady = useCallback(async () => {
    setReadyError(false);
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
    setReadyError(true);
    return false;
  }, [router]);

  useEffect(() => {
    if (isWriter !== null) return;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await pollReady();
    })();
    return () => {
      cancelled = true;
    };
  }, [isWriter, pollReady]);

  if (isWriter === null) {
    if (readyError) {
      return (
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
              void pollReady();
            }}
            className="mt-4 rounded-full bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse"
          >
            Refresh
          </button>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent-primary" />
          <p className="text-sm text-text-muted">Getting your account ready…</p>
        </div>
      </div>
    );
  }

  if (isWriter) {
    // Already a writer — allow updating mailing pref only, plus navigation
    function handleSaveMailing() {
      setError(null);
      startTransition(async () => {
        const res = await completeOnboarding({
          isWriter: true,
          digestEnabled,
          digestFrequency: digestEnabled ? "weekly" : "never",
        });
        if (res.success) {
          router.push(redirectUrl);
        } else {
          setError(res.error);
        }
      });
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-success/30 bg-success/10 p-6">
          <p className="text-sm font-medium text-text-primary">You are already a writer</p>
          <p className="mt-1 text-sm text-text-muted">
            You can create and publish pieces. Update your mailing preference below.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-text-primary">Mailing preference</h2>
          <p className="mt-1 text-sm leading-5 text-text-muted">
            Weekly digest is tracked now and will start sending when we launch digests. You can
            change this anytime in settings.
          </p>
          <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg border border-border bg-bg p-3">
            <span className="text-sm font-medium text-text-primary">Weekly digest</span>
            <input
              type="checkbox"
              checked={digestEnabled}
              onChange={(e) => setDigestEnabled(e.target.checked)}
              className="h-4 w-4 accent-accent-primary"
              aria-label="Weekly digest"
            />
          </label>
          <p className="mt-2 text-xs text-text-muted">
            {digestEnabled ? "You’ll receive weekly (when enabled)." : "You’ll receive nothing (never)."}
          </p>
          {error ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleSaveMailing}
              disabled={isPending}
              className="rounded-full bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-light disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save and continue"}
            </button>
            <button
              type="button"
              onClick={() => router.push(redirectUrl)}
              disabled={isPending}
              className="rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  function handleContinue() {
    setError(null);
    startTransition(async () => {
      const res = await completeOnboarding({
        isWriter: role === "writer",
        digestEnabled,
        digestFrequency: digestEnabled ? "weekly" : "never",
      });
      if (res.success) {
        router.push(redirectUrl);
      } else {
        setError(res.error);
      }
    });
  }

  function handleSkip() {
    setError(null);
    startTransition(async () => {
      const res = await completeOnboarding({
        isWriter: false,
        digestEnabled,
        digestFrequency: digestEnabled ? "weekly" : "never",
      });
      if (res.success) {
        router.push(redirectUrl);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-text-primary">How do you want to get started?</h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          You can read either way. Choose writer to create drafts and submit for review — you can
          enable it later in settings. Your mailing choice is saved now for when digests launch.
        </p>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => setRole("writer")}
            aria-pressed={role === "writer"}
            className={`rounded-xl border px-5 py-3 text-left text-sm font-medium transition-colors ${
              role === "writer"
                ? "border-accent-primary bg-accent-primary text-text-inverse"
                : "border-border bg-surface text-text-primary hover:bg-bg"
            }`}
          >
            <span className="block font-semibold">I want to write too</span>
            <span className={`mt-1 block text-xs font-normal ${role === "writer" ? "opacity-90" : "text-text-muted"}`}>
              Enable writer status so you can create drafts and submit for review.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setRole("reader")}
            aria-pressed={role === "reader"}
            className={`rounded-xl border px-5 py-3 text-left text-sm font-medium transition-colors ${
              role === "reader"
                ? "border-accent-primary bg-accent-primary text-text-inverse"
                : "border-border bg-surface text-text-primary hover:bg-bg"
            }`}
          >
            <span className="block font-semibold">Just reading</span>
            <span className={`mt-1 block text-xs font-normal ${role === "reader" ? "opacity-90" : "text-text-muted"}`}>
              Continue as reader — you can enable writing later in settings.
            </span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold text-text-primary">Mailing preference</h2>
        <p className="mt-1 text-sm leading-5 text-text-muted">
          Weekly digest will start when we launch digests. Your selection is tracked now.
        </p>
        <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg border border-border bg-bg p-3">
          <span className="text-sm font-medium text-text-primary">Weekly digest</span>
          <input
            type="checkbox"
            checked={digestEnabled}
            onChange={(e) => setDigestEnabled(e.target.checked)}
            className="h-4 w-4 accent-accent-primary"
            aria-label="Weekly digest"
          />
        </label>
        <p className="mt-2 text-xs text-text-muted">
          {digestEnabled ? "weekly — you’ll be included when digests launch" : "never — no digest emails"}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleContinue}
          disabled={isPending}
          className="flex-1 rounded-full bg-accent-primary px-5 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-light disabled:opacity-50"
        >
          {isPending ? "Saving…" : role === "writer" ? "Continue as writer" : "Continue as reader"}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={isPending}
          className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg disabled:opacity-50"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
