import Link from "next/link";
import { z } from "zod";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { SiteHeader } from "@/components/site-header";
import { SearchInput } from "@/components/search-input";
import { currentUser } from "@/lib/auth";
import { searchPieces } from "@/lib/db/queries/search";
import { sanitizeHeadline } from "@/lib/sanitize";

const PAGE_SIZE = 10;

const searchParamsSchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function excerpt(html: string, max = 180): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  const raw = await searchParams;
  const parsed = searchParamsSchema.safeParse({
    q: raw?.q,
    page: raw?.page,
  });

  const q = parsed.success ? parsed.data.q?.trim() ?? "" : raw?.q?.trim() ?? "";
  const page = parsed.success ? parsed.data.page : 1;
  const isValidQuery = q.length >= 2;
  const viewer = await currentUser();

  // Viewer-aware search with banner on error — never throw to error boundary.
  let rows: Awaited<ReturnType<typeof searchPieces>> = [];
  let searchError = false;
  if (isValidQuery) {
    try {
      rows = await searchPieces(q, viewer, {
        limit: PAGE_SIZE + 1,
        offset: (page - 1) * PAGE_SIZE,
      });
    } catch (e) {
      console.error("[search] searchPieces failed", e);
      searchError = true;
    }
  }
  const hasNext = !searchError && rows.length > PAGE_SIZE;
  const results = rows.slice(0, PAGE_SIZE);

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    qs.set("q", q);
    if (p > 1) qs.set("page", String(p));
    return `/search?${qs.toString()}`;
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">Search</h1>
        <p className="mt-1 text-sm text-text-muted">Find pieces by title and body — ranked by relevance.</p>

        <div className="mt-6">
          <SearchInput defaultValue={q} />
        </div>

        {searchError ? (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text-primary"
          >
            Search is temporarily unavailable — please try again.
            <div className="mt-2 flex gap-3">
              <Link href={`/search?q=${encodeURIComponent(q)}`} className="font-medium text-accent-primary underline">
                Retry
              </Link>
              <Link href="/" className="font-medium text-text-muted underline">
                Browse latest pieces
              </Link>
            </div>
          </div>
        ) : !q ? (
          <div className="mt-10 rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-sm text-text-muted">Type a query above to search published pieces.</p>
            <p className="mt-2 text-xs text-text-muted opacity-70">Try &ldquo;poetry&rdquo;, &ldquo;fiction&rdquo;, or a phrase from a title.</p>
          </div>
        ) : !isValidQuery ? (
          <div className="mt-10 rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-sm text-text-muted">Query too short — enter at least 2 characters.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="mt-10 rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-sm text-text-muted">
              No results for &ldquo;<span className="font-medium text-text-primary">{q}</span>&rdquo;.
            </p>
            <Link href="/" className="mt-3 inline-flex text-sm font-medium text-accent-primary hover:text-accent-primary-light">
              Browse latest pieces
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-6 text-xs text-text-muted">
              {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
              {page > 1 ? ` — page ${page}` : ""}
            </p>
            <ul className="mt-4 space-y-4">
              {results.map((piece) => {
                const headlineHtml = piece.headline ? sanitizeHeadline(piece.headline) : null;
                return (
                  <li key={piece.id} className="rounded-xl border border-border bg-surface p-6">
                    <Link href={`/pieces/${piece.slug}`} className="group block">
                      <h2 className="font-serif text-lg font-semibold text-text-primary transition-colors group-hover:text-accent-primary">
                        {piece.title}
                      </h2>
                      {headlineHtml ? (
                        <p
                          className="mt-1.5 text-sm leading-6 text-text-muted [&_mark]:rounded-sm [&_mark]:bg-accent-primary/15 [&_mark]:px-0.5 [&_mark]:text-text-primary"
                          dangerouslySetInnerHTML={{ __html: headlineHtml }}
                        />
                      ) : (
                        <p className="mt-1.5 text-sm leading-6 text-text-muted">{excerpt(piece.body)}</p>
                      )}
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
                );
              })}
            </ul>

            {page > 1 || hasNext ? (
              <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
                {page > 1 ? (
                  <Link
                    href={pageHref(page - 1)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
                  >
                    <ArrowLeftIcon className="h-4 w-4" aria-hidden /> Newer
                  </Link>
                ) : (
                  <span />
                )}
                {hasNext ? (
                  <Link
                    href={pageHref(page + 1)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
                  >
                    Older <ArrowRightIcon className="h-4 w-4" aria-hidden />
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </>
        )}
      </main>
    </>
  );
}
