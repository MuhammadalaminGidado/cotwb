import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { notFound } from "next/navigation";
import { canWrite, currentUser } from "@/lib/auth";
import { getPieceForEdit } from "@/lib/db/queries/pieces";
import { EditPieceClient } from "@/components/editor/edit-piece-client";
import { getViewerGroups } from "@/lib/db/queries/shared";

type Params = { params: Promise<{ id: string }> };

export default async function EditPiecePage({ params }: Params) {
  const { id } = await params;
  const user = await currentUser();

  if (!user || !canWrite(user)) {
    notFound();
  }

  const piece = await getPieceForEdit(id, user);
  if (!piece) {
    notFound();
  }

  const groups = await getViewerGroups(user);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary">
        <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden="true" /> Back
      </Link>
      <h1 className="mt-3 font-serif text-2xl font-semibold text-text-primary">Edit piece</h1>
      <p className="mt-2 text-sm text-text-muted">
        Your draft autosaves. Submit when ready for review.
      </p>
      <div className="mt-6">
        <EditPieceClient
          pieceId={piece.id}
          title={piece.title}
          body={piece.body}
          visibility={piece.visibility as "public" | "group" | "private"}
          groupId={piece.groupId ?? null}
          groups={groups}
          reviewStatus={piece.reviewStatus}
        />
      </div>
    </div>
  );
}
