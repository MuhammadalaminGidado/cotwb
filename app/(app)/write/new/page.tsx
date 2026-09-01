import Link from "next/link";
import { BecomeWriterDialog } from "@/components/become-writer-dialog";
import { NewPieceForm } from "@/components/editor/new-piece-form";
import { canModerate, canWrite, currentUser } from "@/lib/auth";

export default async function WriteNewPage() {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  if (!canWrite(user)) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <h1 className="font-serif text-2xl font-semibold text-text-primary">
          Write
        </h1>
        <div className="mt-6 rounded-xl border border-warning/30 bg-warning/10 p-6">
          <h2 className="text-base font-semibold text-text-primary">
            Enable writing to create pieces
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Your account does not have writer access yet. Enable writing to
            create drafts and submit for review. This action is irreversible —
            only an admin can revoke it.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-block text-sm font-medium text-accent-primary hover:text-accent-primary-light"
          >
            Go to settings to enable writing →
          </Link>
        </div>
        <div className="mt-6">
          <BecomeWriterDialog
            isWriter={user.isWriter}
            isAdmin={canModerate(user)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="font-serif text-2xl font-semibold text-text-primary">
        New piece
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Create a draft. It will autosave once you open the editor.
      </p>
      <div className="mt-6">
        <NewPieceForm />
      </div>
    </div>
  );
}
