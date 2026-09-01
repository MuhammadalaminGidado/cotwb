"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approvePiece, rejectPiece } from "@/lib/actions/reviews";

export function ReviewQueueActions({ pieceId }: { pieceId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approvePiece({ pieceId, notes: notes || undefined });
      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectPiece({ pieceId, notes: notes || undefined });
      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Review notes (optional)"
        rows={2}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending}
          className="rounded-full bg-success px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={isPending}
          className="rounded-full border border-danger bg-surface px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger hover:text-text-inverse disabled:opacity-50"
        >
          {isPending ? "…" : "Reject"}
        </button>
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
