import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SearchInstant } from "@/components/search-instant";
import { SearchTypesenseInstant } from "@/components/search-typesense-instant";
import { currentUser } from "@/lib/auth";
import { generateSecuredSearchKey, hasAlgolia } from "@/lib/search/algolia";
import { generateScopedSearchKey as generateTypesenseKey, hasTypesense } from "@/lib/search/typesense";

function Unavailable({ message }: { message: string }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">Search</h1>
        <p className="mt-1 text-sm text-text-muted">Find pieces by title and body — ranked by relevance.</p>
        <div role="alert" className="mt-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text-primary">
          {message}
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

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  const raw = await searchParams;
  const q = (raw?.q ?? "").trim().slice(0, 100);
  const viewer = await currentUser();

  // Prefer Typesense Cloud when configured (per brief: Cloud, scoped keys, direct typesense-js)
  if (hasTypesense()) {
    const ts = await generateTypesenseKey(viewer);
    if (!ts) {
      return <Unavailable message="Search is temporarily unavailable — try again." />;
    }
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">Search</h1>
          <p className="mt-1 text-sm text-text-muted">Find pieces by title and body — ranked by relevance.</p>
          <SearchTypesenseInstant
            host={ts.host}
            port={ts.port}
            protocol={ts.protocol}
            apiKey={ts.searchKey}
            collection={ts.collection}
            filterBy={ts.filterBy}
            initialQuery={q}
          />
        </main>
      </>
    );
  }

  if (!hasAlgolia()) {
    return <Unavailable message="Search is temporarily unavailable — Algolia not configured." />;
  }

  const secured = await generateSecuredSearchKey(viewer);
  if (!secured) {
    return <Unavailable message="Search is temporarily unavailable — try again." />;
  }

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
          filters={secured.filters}
          initialQuery={q}
        />
      </main>
    </>
  );
}
