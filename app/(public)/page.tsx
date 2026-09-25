import { PieceCard } from "@/components/piece-card";
import { SiteHeader } from "@/components/site-header";
import { getFeedTagCounts, getPublishedPieces } from "@/lib/db/queries/pieces";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

const PAGE_SIZE = 10;

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const tagSlug = params?.tag?.trim() || null;

  // Fetch with graceful fallback — DB drift (e.g. pending 0002) must not 500 the feed.
  let rows: Awaited<ReturnType<typeof getPublishedPieces>> = [];
  let feedTags: Awaited<ReturnType<typeof getFeedTagCounts>> = [];
  try {
    rows = await getPublishedPieces({
      limit: PAGE_SIZE + 1,
      offset: (page - 1) * PAGE_SIZE,
      tagSlug: tagSlug ?? undefined,
    });
  } catch (e) {
    console.error("[feed] getPublishedPieces failed", e);
  }
  try {
    feedTags = await getFeedTagCounts();
  } catch (e) {
    console.error("[feed] getFeedTagCounts failed", e);
  }
  const hasNext = rows.length > PAGE_SIZE;
  const pieces = rows.slice(0, PAGE_SIZE);

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (p > 1) qs.set("page", String(p));
    if (tagSlug) qs.set("tag", tagSlug);
    const s = qs.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">
          {tagSlug ? `Pieces tagged “${tagSlug}”` : "Latest pieces"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Approved writing from the COTWB community.
        </p>

        {feedTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {tagSlug ? (
              <Link
                href="/"
                className="inline-flex items-center gap-1 rounded-full border border-accent-primary bg-accent-primary px-3 py-1 text-xs font-medium text-text-inverse transition-colors hover:bg-accent-primary-light"
                aria-label={`Clear tag filter: ${tagSlug}`}
              >
                {tagSlug} <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
            {feedTags
              .filter((t) => t.slug !== tagSlug)
              .map((tag) => (
                <Link
                  key={tag.id}
                  href={`/?tag=${tag.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-bg hover:text-text-primary"
                >
                  {tag.name}
                  <span className="text-[10px] text-text-muted opacity-70">
                    {tag.count}
                  </span>
                </Link>
              ))}
          </div>
        ) : null}

        {pieces.length === 0 ? (
          <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-center">
            <p className="text-sm text-text-muted">
              {page > 1
                ? "No pieces on this page."
                : tagSlug
                  ? `No approved public pieces tagged “${tagSlug}”.`
                  : "Nothing published yet. Approved pieces will appear here."}
            </p>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {pieces.map((piece) => (
              <PieceCard key={piece?.id} piece={piece} />
            ))}
          </ul>
        )}

        {page > 1 || hasNext ? (
          <nav
            className="mt-6 flex items-center justify-between"
            aria-label="Pagination"
          >
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
      </main>
    </>
  );
}
