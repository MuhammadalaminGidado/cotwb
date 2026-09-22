import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClerkUserMenu } from "@/components/user-menu";
import { SearchAutocomplete } from "@/components/search-autocomplete";
import { canModerate, currentUser } from "@/lib/auth";
import { hasClerk } from "@/lib/clerk-config";
import { generateSecuredSearchKey as generateAlgoliaKey, hasAlgolia } from "@/lib/search/algolia";
import { generateScopedSearchKey as generateTypesenseKey, hasTypesense } from "@/lib/search/typesense";
import { SearchTypesenseAutocomplete } from "@/components/search-typesense-autocomplete";

function SearchSlot({
  algoliaSecured,
  typesense,
}: {
  algoliaSecured: Awaited<ReturnType<typeof generateAlgoliaKey>>;
  typesense: Awaited<ReturnType<typeof generateTypesenseKey>>;
}) {
  // Prefer Typesense when configured (Cloud), fallback to Algolia
  if (typesense) {
    return (
      <SearchTypesenseAutocomplete
        host={typesense.host}
        port={typesense.port}
        protocol={typesense.protocol}
        apiKey={typesense.searchKey}
        collection={typesense.collection}
        filterBy={typesense.filterBy}
      />
    );
  }
  if (algoliaSecured) {
    return (
      <SearchAutocomplete
        appId={algoliaSecured.appId}
        apiKey={algoliaSecured.securedKey}
        indexName={algoliaSecured.indexName}
        filters={algoliaSecured.filters}
      />
    );
  }
  return (
    <div role="alert" className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-medium text-text-primary">
      Search unavailable
    </div>
  );
}

function NavLinks({ isAdmin, isAuthed, mobile }: { isAdmin: boolean; isAuthed: boolean; mobile?: boolean }) {
  const cls = mobile ? "text-sm font-medium text-text-muted" : "text-sm font-medium text-text-muted transition-colors hover:text-text-primary";
  return (
    <>
      <Link href="/" className={cls}>
        Home
      </Link>
      <Link href="/write/new" className={cls}>
        Write
      </Link>
      {isAdmin ? (
        <Link href="/review-queue" className={cls}>
          Review queue
        </Link>
      ) : null}
      {isAuthed ? (
        <Link href="/settings" className={cls}>
          Settings
        </Link>
      ) : null}
    </>
  );
}

export async function SiteHeader() {
  const user = await currentUser();
  const clerkReady = hasClerk();
  // Prefer Typesense Cloud when configured, fallback to Algolia
  const typesenseSecured = hasTypesense() ? await generateTypesenseKey(user) : null;
  const algoliaSecured = !typesenseSecured && hasAlgolia() ? await generateAlgoliaKey(user) : null;

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-6 py-3">
        <div className="flex items-center gap-6 shrink-0">
          <Link href="/" className="font-serif text-lg font-semibold tracking-tight text-text-primary" title="Chip of the Writer's Block">
            COTWB
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            <NavLinks isAdmin={canModerate(user)} isAuthed={!!user} />
          </nav>
        </div>

        <div className="hidden flex-1 justify-center sm:flex">
          <div className="w-full max-w-[min(680px,55vw)]">
            <SearchSlot algoliaSecured={algoliaSecured} typesense={typesenseSecured} />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-text-muted sm:inline">{user.username}</span>
              {clerkReady ? <ClerkUserMenu /> : null}
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-full bg-accent-primary px-4 py-1.5 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-light"
              title={!clerkReady ? "Clerk not configured" : undefined}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-border px-6 py-2 sm:hidden">
        <SearchSlot algoliaSecured={algoliaSecured} typesense={typesenseSecured} />
      </div>

      <nav className="flex items-center gap-6 border-t border-border px-6 py-2 sm:hidden">
        <NavLinks isAdmin={canModerate(user)} isAuthed={!!user} mobile />
      </nav>
    </header>
  );
}
