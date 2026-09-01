import { notFound } from "next/navigation";
import { canWrite, currentUser } from "@/lib/auth";
import { getPieceForEdit } from "@/lib/db/queries/pieces";
import { EditPieceClient } from "@/components/editor/edit-piece-client";

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

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="font-serif text-2xl font-semibold text-text-primary">
        Edit piece
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Your draft autosaves. Submit when ready for review.
      </p>
      <div className="mt-6">
        <EditPieceClient
          pieceId={piece.id}
          title={piece.title}
          body={piece.body}
          visibility={piece.visibility as "public" | "group" | "private"}
          reviewStatus={piece.reviewStatus}
        />
      </div>
    </div>
  );
}
