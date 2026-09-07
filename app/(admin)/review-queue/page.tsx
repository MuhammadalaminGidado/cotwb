import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { canModerate, currentUser } from "@/lib/auth";
import { getReviewQueuePieces } from "@/lib/db/queries/pieces";
import { ReviewQueueActions } from "@/components/review-queue-actions";

export default async function ReviewQueuePage() {
  const user = await currentUser();
  if (!user || !canModerate(user)) {
    return null;
  }

  const pieces = await getReviewQueuePieces();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary">
        <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden="true" /> Back to home
      </Link>
      <h1 className="mt-3 font-serif text-2xl font-semibold text-text-primary">Review queue</h1>
      <p className="mt-2 text-sm text-text-muted">
        {pieces.length === 0
          ? "No pieces awaiting review."
          : `${pieces.length} piece${pieces.length === 1 ? "" : "s"} awaiting review.`}
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {pieces.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6">
            <p className="text-sm text-text-muted">All caught up.</p>
          </div>
        ) : (
          pieces.map((piece) => (
            <article
              key={piece.id}
              className="rounded-xl border border-border bg-surface p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    {piece.title}
                  </h2>
                  <p className="mt-1 text-xs text-text-muted">
                    by {piece.author.username} · {piece.visibility} · {piece.reviewStatus} ·{" "}
                    {piece.slug}
                  </p>
                </div>
                <span className="rounded-full border border-warning bg-warning/10 px-3 py-1 text-xs font-medium text-text-primary">
                  {piece.reviewStatus}
                </span>
              </div>

              <div
                className="prose prose-sm mt-4 max-w-none text-text-primary"
                dangerouslySetInnerHTML={{ __html: piece.body }}
              />

              <ReviewQueueActions pieceId={piece.id} />
            </article>
          ))
        )}
      </div>
    </div>
  );
}
