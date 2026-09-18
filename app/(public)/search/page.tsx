import Link from "next/link";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { SearchInstant } from "@/components/search-instant";
import { currentUser } from "@/lib/auth";
import { generateSecuredSearchKey, hasAlgolia } from "@/lib/search/algolia";

const searchParamsSchema = z.object({
  q: z.string().trim().max(100).optional(),
});

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  const raw = await searchParams;
  const parsed = searchParamsSchema.safeParse({ q: raw?.q });
  const q = parsed.success ? (parsed.data.q?.trim() ?? "") : raw?.q?.trim() ?? "";
  const viewer = await currentUser();

  if (!hasAlgolia()) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">Search</h1>
          <p className="mt-1 text-sm text-text-muted">Find pieces by title and body — ranked by relevance.</p>
          <div role="alert" className="mt-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text-primary">
            Search is temporarily unavailable — Algolia not configured.
            <div className="mt-2">
              <Link href="/" className="font-medium text-accent-primary underline">
                Browse latest pieces
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Viewer-aware secured key + filters (best practice: filters baked into key so client cannot bypass)
  const secured = await generateSecuredSearchKey(viewer);
  if (!secured) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">Search</h1>
          <p className="mt-1 text-sm text-text-muted">Find pieces by title and body — ranked by relevance.</p>
          <div role="alert" className="mt-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text-primary">
            Search is temporarily unavailable — try again.
            <div className="mt-2 flex gap-3">
              <Link href="/" className="font-medium text-text-muted underline">
                Browse latest pieces
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Fallback for case where secured generation used plain key — still pass filters via Configure
  const filters = secured.filters;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">Search</h1>
        <p className="mt-1 text-sm text-text-muted">Find pieces by title and body — ranked by relevance.</p>
        <SearchInstant
          appId={secured.appId}
          apiKey={secured.securedKey}
          indexName={secured.indexName}
          filters={filters}
          initialQuery={q}
        />
      </main>
    </>
  );
}
