import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { currentUser } from "@/lib/auth";
import { getPieceBySlug } from "@/lib/db/queries/pieces";
import { excerpt, sanitizePieceBody } from "@/lib/sanitize";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const piece = await getPieceBySlug(slug, null);
  if (!piece || piece.reviewStatus !== "approved") return { title: "Piece" };
  return { title: piece.title, description: excerpt(piece.body, 160) };
}

export default async function PieceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await currentUser();
  const piece = await getPieceBySlug(slug, viewer);
  if (!piece) notFound();

  const clean = sanitizePieceBody(piece.body);
  const isPreview = piece.reviewStatus !== "approved";

  return (
    <>
      <SiteHeader />
      <article className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
        >
          ← All pieces
        </Link>

        {isPreview ? (
          <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-text-primary" role="status">
            Preview — this piece is <strong>{piece.reviewStatus}</strong> and not publicly visible.
          </p>
        ) : null}

        <header className="mt-6">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-text-primary">{piece.title}</h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-text-muted">
            <Link href={`/authors/${piece.author.username}`} className="font-medium transition-colors hover:text-text-primary">
              {piece.author.displayName ?? piece.author.username}
            </Link>
            <span aria-hidden>·</span>
            <time dateTime={piece.publishedAt?.toISOString()}>
              {piece.publishedAt ? dateFormatter.format(piece.publishedAt) : dateFormatter.format(piece.createdAt)}
            </time>
          </div>
        </header>

        <div className="piece-prose mt-8" dangerouslySetInnerHTML={{ __html: clean }} />
      </article>
    </>
  );
}
