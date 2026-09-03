"use client";

import { useState, useTransition } from "react";
import { updateMailingPreferences } from "@/lib/actions/onboarding";

type Props = {
  initialEnabled: boolean;
  initialFrequency: "weekly" | "never";
};

export function MailingPreferencesForm({ initialEnabled, initialFrequency }: Props) {
  void initialFrequency; // tracked for future digest launch, not yet rendered separately
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const frequency: "weekly" | "never" = enabled ? "weekly" : "never";

  function handleSave() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await updateMailingPreferences({
        digestEnabled: enabled,
        digestFrequency: frequency,
      });
      if (res.success) {
        setMessage("Mailing preference saved. Will apply when digests launch.");
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="text-sm font-semibold text-text-primary">Mailing preferences</h2>
      <p className="mt-1 text-sm leading-5 text-text-muted">
        Digests are not yet sending — your choice is tracked now and will apply on launch. Change
        anytime.
      </p>
      <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg border border-border bg-bg p-3">
        <span className="text-sm font-medium text-text-primary">Weekly digest</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 accent-accent-primary"
          aria-label="Weekly digest"
        />
      </label>
      <p className="mt-2 text-xs text-text-muted">{enabled ? "weekly" : "never — no emails"}</p>
      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="mt-2 text-sm text-success">{message}</p> : null}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="mt-4 cursor-pointer rounded-full bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse shadow-sm transition-all hover:bg-accent-primary-light active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
      >
        {isPending ? "Saving…" : "Save preferences"}
      </button>
    </div>
  );
}
