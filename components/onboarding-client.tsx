"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import {
  checkOnboardingReady,
  completeOnboarding,
} from "@/lib/actions/onboarding";
import { getSafeRedirect } from "@/lib/redirect";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

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

  const pollReady = useCallback(
    async (signal?: AbortSignal) => {
      setReadyError(false);
      for (let i = 0; i < 24; i += 1) {
        if (signal?.aborted) return false;
        try {
          const res = await checkOnboardingReady();
          if (res.ready) {
            if (!signal?.aborted) router.refresh();
            return true;
          }
        } catch {
          // ignore and retry
        }
        await new Promise<void>((r) => setTimeout(r, 500));
        if (signal?.aborted) return false;
      }
      if (!signal?.aborted) setReadyError(true);
      return false;
    },
    [router],
  );

  useEffect(() => {
    if (isWriter !== null) return;
    const ctrl = new AbortController();
    void pollReady(ctrl.signal);
    return () => ctrl.abort();
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
            className="mt-4 cursor-pointer rounded-full bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-light active:scale-[0.97] disabled:cursor-not-allowed motion-reduce:transition-none"
          >
            Refresh
          </button>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin motion-reduce:animate-none rounded-full border-2 border-border border-t-accent-primary" />
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
          <p className="text-sm font-medium text-text-primary">
            You are already a writer
          </p>
          <p className="mt-1 text-sm text-text-muted">
            You can create and publish pieces. Update your mailing preference
            below.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-text-primary">
            Mailing preference
          </h2>
          <p className="mt-1 text-sm leading-5 text-text-muted">
            Weekly digest is tracked now and will start sending when we launch
            digests. You can change this anytime in settings.
          </p>
          <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg border border-border bg-bg p-3">
            <span className="text-sm font-medium text-text-primary">
              Weekly digest
            </span>
            <input
              type="checkbox"
              checked={digestEnabled}
              onChange={(e) => setDigestEnabled(e.target.checked)}
              className="h-4 w-4 accent-accent-primary"
              aria-label="Weekly digest"
            />
          </label>
          <p className="mt-2 text-xs text-text-muted">
            {digestEnabled
              ? "You’ll receive weekly (when enabled)."
              : "You’ll receive nothing (never)."}
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
              className="cursor-pointer rounded-full bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse shadow-sm transition-all hover:bg-accent-primary-light active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              {isPending ? "Saving…" : "Continue"}
            </button>
            <button
              type="button"
              onClick={() => router.push(redirectUrl)}
              disabled={isPending}
              className="cursor-pointer rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
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
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-base font-semibold tracking-tight text-text-primary">
          How do you want to get started?
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-text-muted">
          Pick a starting point. You can switch anytime in settings. Mailing choice is saved now for when digests launch.
        </p>

        <fieldset className="mt-5 grid gap-3" aria-label="Choose role">
          <label
            className={`group flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all duration-150 ease-out motion-reduce:transition-none ${
              role === "writer"
                ? "border-accent-primary bg-accent-primary/10 shadow-sm"
                : "border-border bg-surface hover:bg-bg hover:border-border"
            }`}
          >
            <input
              type="radio"
              name="onboarding-role"
              value="writer"
              checked={role === "writer"}
              onChange={() => setRole("writer")}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-accent-primary"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-text-primary">I want to write too</span>
              <span className="mt-1 block text-xs leading-5 text-text-muted">
                Create drafts and submit for review. You can’t undo this yourself — only an admin can revoke.
              </span>
            </span>
            <span
              className={`mt-0.5 hidden h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] leading-none sm:flex ${
                role === "writer" ? "border-accent-primary bg-accent-primary text-text-inverse" : "border-border bg-surface text-transparent"
              }`}
              aria-hidden
            >
              ✓
            </span>
          </label>

          <label
            className={`group flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all duration-150 ease-out motion-reduce:transition-none ${
              role === "reader"
                ? "border-accent-primary bg-accent-primary/10 shadow-sm"
                : "border-border bg-surface hover:bg-bg hover:border-border"
            }`}
          >
            <input
              type="radio"
              name="onboarding-role"
              value="reader"
              checked={role === "reader"}
              onChange={() => setRole("reader")}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-accent-primary"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-text-primary">Just reading</span>
              <span className="mt-1 block text-xs leading-5 text-text-muted">Browse and read — enable writing later in settings.</span>
            </span>
            <span
              className={`mt-0.5 hidden h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] leading-none sm:flex ${
                role === "reader" ? "border-accent-primary bg-accent-primary text-text-inverse" : "border-border bg-surface text-transparent"
              }`}
              aria-hidden
            >
              ✓
            </span>
          </label>
        </fieldset>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Mailing preference</h2>
            <p className="mt-1 text-sm leading-5 text-text-muted">Weekly digest. Tracked now, sent when laun­ched.</p>
          </div>
          <span className="hidden text-xs font-medium text-text-muted sm:block">{digestEnabled ? "weekly" : "never"}</span>
        </div>
        <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-bg px-3 py-3 transition-colors hover:bg-surface">
          <span className="text-sm font-medium text-text-primary">Weekly digest</span>
          <input
            type="checkbox"
            checked={digestEnabled}
            onChange={(e) => setDigestEnabled(e.target.checked)}
            className="h-4 w-4 shrink-0 cursor-pointer accent-accent-primary"
            aria-label="Weekly digest"
          />
        </label>
        <p className="mt-2 text-xs leading-5 text-text-muted">
          {digestEnabled ? "You’ll be included when digests launch." : "No digest emails — you can enable later."}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleContinue}
          disabled={isPending}
          className="flex-1 cursor-pointer rounded-full bg-accent-primary px-5 py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-all duration-150 ease-out hover:bg-accent-primary-light active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          {isPending ? "Saving…" : "Continue"}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={isPending}
          className="cursor-pointer rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
        >
          Skip
        </button>
      </div>
      <p className="text-center text-xs leading-5 text-text-muted">You can change role and mailing anytime in Settings.</p>
    </div>
  );
}
