import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { SiteHeader } from "@/components/site-header";
import { PieceCard } from "@/components/piece-card";
import { Avatar } from "@/components/ui/avatar";
import { getUserByUsername, getPublishedPiecesByAuthor } from "@/lib/db/queries/authors";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const author = await getUserByUsername(username);
  if (!author) return { title: "Author" };
  return { title: author.displayName ?? `@${author.username}` };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const author = await getUserByUsername(username);
  if (!author) notFound();

  const pieces = await getPublishedPiecesByAuthor(author.id);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden /> All pieces
        </Link>

        <header className="mt-6 flex items-center gap-4">
          <Avatar
            src={author.image}
            name={author.displayName ?? author.username}
            alt={author.displayName ?? author.username ?? "Author"}
            size={48}
          />
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">
              {author.displayName ?? author.username}
            </h1>
            <p className="text-sm text-text-muted">@{author.username}</p>
          </div>
        </header>
        {author.bio ? (
          <p className="mt-4 text-sm leading-6 text-text-muted">{author.bio}</p>
        ) : null}

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Published pieces
        </h2>

        {pieces.length === 0 ? (
          <div className="mt-4 rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-sm text-text-muted">No public pieces yet.</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {pieces.map((piece) => (
              <PieceCard key={piece.id} piece={piece} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
