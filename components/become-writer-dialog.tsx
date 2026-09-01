"use client";

import { useState, useTransition } from "react";
import { becomeWriter } from "@/lib/actions/writer";

type Props = {
  isWriter: boolean;
  isAdmin: boolean;
};

export function BecomeWriterDialog({ isWriter, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await becomeWriter();
      if (result.success) {
        setSuccess(true);
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  if (isWriter) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm font-medium text-text-primary">Writer status</p>
        <p className="mt-1 text-sm text-text-muted">
          You are a writer. You can create and publish pieces.
          {isAdmin ? "" : " Only an admin can revoke this status."}
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/10 p-4">
        <p className="text-sm font-medium text-text-primary">You are now a writer</p>
        <p className="mt-1 text-sm text-text-muted">
          You can now create and publish pieces.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm font-medium text-text-primary">Become a writer</p>
        <p className="mt-1 text-sm text-text-muted">
          Writers can create drafts, submit for review, and publish pieces.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-full bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-light"
        >
          Become a writer
        </button>
        {error ? (
          <p className="mt-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="writer-dialog-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg">
            <h2
              id="writer-dialog-title"
              className="text-base font-semibold text-text-primary"
            >
              Confirm writer status
            </h2>
            <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
              <p className="text-sm font-medium text-text-primary">
                This action is irreversible.
              </p>
              <p className="mt-1 text-sm leading-5 text-text-muted">
                Once you become a writer, you cannot undo this yourself. Only
                an admin can revoke writer status. Are you sure you want to
                proceed?
              </p>
            </div>
            {error ? (
              <p className="mt-3 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                disabled={isPending}
                className="rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded-full bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-light disabled:opacity-50"
              >
                {isPending ? "Confirming…" : "Confirm — Become a writer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
