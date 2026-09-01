"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PieceEditor } from "@/components/editor/piece-editor";
import { deletePiece, submitForReview } from "@/lib/actions/pieces";

type Props = {
  pieceId: string;
  title: string;
  body: string;
  visibility: "public" | "group" | "private";
  reviewStatus: string;
};

export function EditPieceClient({ pieceId, title, body, visibility, reviewStatus }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitForReview({ id: pieceId });
      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this piece? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deletePiece({ id: pieceId });
      if (!result.success) {
        setError(result.error);
      } else {
        router.push("/write/new");
      }
    });
  }

  const canSubmit = reviewStatus === "draft" || reviewStatus === "rejected";
  const canDelete = reviewStatus !== "approved";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            reviewStatus === "approved"
              ? "bg-success text-text-inverse"
              : reviewStatus === "rejected"
                ? "bg-danger text-text-inverse"
                : reviewStatus === "submitted" || reviewStatus === "in_review"
                  ? "bg-warning text-text-inverse"
                  : "border border-border bg-surface text-text-muted"
          }`}
        >
          {reviewStatus}
        </span>
        <span className="text-xs text-text-muted">Visibility: {visibility}</span>
      </div>

      <PieceEditor
        pieceId={pieceId}
        initialTitle={title}
        initialBody={body}
        initialVisibility={visibility}
      />

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        {canSubmit ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-full bg-accent-primary px-6 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-light disabled:opacity-50"
          >
            {isPending ? "Submitting…" : "Submit for review"}
          </button>
        ) : (
          <p className="text-sm text-text-muted">
            This piece is {reviewStatus} and cannot be resubmitted.
          </p>
        )}

        {canDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-full border border-danger bg-surface px-6 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger hover:text-text-inverse disabled:opacity-50"
          >
            Delete draft
          </button>
        ) : null}
      </div>
    </div>
  );
}
