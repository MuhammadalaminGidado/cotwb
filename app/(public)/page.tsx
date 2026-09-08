import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { SiteHeader } from "@/components/site-header";
import { getPublishedPieces } from "@/lib/db/queries/pieces";

const PAGE_SIZE = 10;

function excerpt(html: string, max = 180): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);

  // Fetch one extra row to detect whether a next page exists.
  const rows = await getPublishedPieces({
    limit: PAGE_SIZE + 1,
    offset: (page - 1) * PAGE_SIZE,
  });
  const hasNext = rows.length > PAGE_SIZE;
  const pieces = rows.slice(0, PAGE_SIZE);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">
          Latest pieces
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Approved writing from the COTWB community.
        </p>

        {pieces.length === 0 ? (
          <div className="mt-10 rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-sm text-text-muted">
              {page > 1
                ? "No pieces on this page."
                : "Nothing published yet. Approved pieces will appear here."}
            </p>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {pieces.map((piece) => (
              <li
                key={piece.id}
                className="rounded-xl border border-border bg-surface p-6"
              >
                <Link href={`/pieces/${piece.slug}`} className="group block">
                  <h2 className="font-serif text-lg font-semibold text-text-primary transition-colors group-hover:text-accent-primary">
                    {piece.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-6 text-text-muted">
                    {excerpt(piece.body)}
                  </p>
                </Link>
                <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                  <Link
                    href={`/authors/${piece.author.username}`}
                    className="font-medium transition-colors hover:text-text-primary"
                  >
                    {piece.author.displayName ?? piece.author.username}
                  </Link>
                  <span aria-hidden>·</span>
                  <time dateTime={piece.publishedAt?.toISOString()}>
                    {piece.publishedAt
                      ? dateFormatter.format(piece.publishedAt)
                      : dateFormatter.format(piece.createdAt)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}

        {page > 1 || hasNext ? (
          <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
            {page > 1 ? (
              <Link
                href={page === 2 ? "/" : `/?page=${page - 1}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
              >
                <ArrowLeftIcon className="h-4 w-4" aria-hidden /> Newer
              </Link>
            ) : (
              <span />
            )}
            {hasNext ? (
              <Link
                href={`/?page=${page + 1}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
              >
                Older <ArrowRightIcon className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </main>
    </>
  );
}
