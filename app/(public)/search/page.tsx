import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SearchInstant } from "@/components/search-instant";
import { currentUser } from "@/lib/auth";
import { generateSecuredSearchKey, hasAlgolia } from "@/lib/search/algolia";

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
