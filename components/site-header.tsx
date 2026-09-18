import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClerkUserMenu } from "@/components/user-menu";
import { SearchInput } from "@/components/search-input";
import { SearchAutocomplete } from "@/components/search-autocomplete";
import { currentUser } from "@/lib/auth";
import { hasClerk } from "@/lib/clerk-config";
import { generateSecuredSearchKey, hasAlgolia } from "@/lib/search/algolia";

export async function SiteHeader() {
  const user = await currentUser();
  const clerkReady = hasClerk();
  const algoliaAvailable = hasAlgolia();
  const secured = algoliaAvailable ? await generateSecuredSearchKey(user) : null;

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-serif text-lg font-semibold tracking-tight text-text-primary"
            title="Chip of the Writer's Block"
          >
            COTWB
          </Link>
          <nav className="hidden items-center gap-4 sm:flex">
            <Link
              href="/"
              className="text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
            >
              Home
            </Link>
            <Link
              href="/write/new"
              className="text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
            >
              Write
            </Link>
            {user?.role === "admin" ? (
              <Link
                href="/review-queue"
                className="text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
              >
                Review queue
              </Link>
            ) : null}
            {user ? (
              <Link
                href="/settings"
                className="text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
              >
                Settings
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            {secured ? (
              <SearchAutocomplete
                appId={secured.appId}
                apiKey={secured.securedKey}
                indexName={secured.indexName}
                filters={secured.filters}
              />
            ) : (
              <SearchInput />
            )}
          </div>
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-text-muted sm:inline">{user.username}</span>
              {clerkReady ? <ClerkUserMenu /> : null}
            </div>
          ) : clerkReady ? (
            <Link
              href="/sign-in"
              className="rounded-full bg-accent-primary px-4 py-1.5 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-light"
            >
              Sign in
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-full bg-accent-primary px-4 py-1.5 text-sm font-medium text-text-inverse"
              title="Clerk not configured"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-border px-6 py-2 sm:hidden">
        {secured ? (
          <SearchAutocomplete
            appId={secured.appId}
            apiKey={secured.securedKey}
            indexName={secured.indexName}
            filters={secured.filters}
          />
        ) : (
          <SearchInput />
        )}
      </div>

      <nav className="flex items-center gap-4 border-t border-border px-6 py-2 sm:hidden">
        <Link href="/" className="text-sm font-medium text-text-muted">
          Home
        </Link>
        <Link href="/write/new" className="text-sm font-medium text-text-muted">
          Write
        </Link>
        {user?.role === "admin" ? (
          <Link href="/review-queue" className="text-sm font-medium text-text-muted">
            Review queue
          </Link>
        ) : null}
        {user ? (
          <Link href="/settings" className="text-sm font-medium text-text-muted">
            Settings
          </Link>
        ) : null}
      </nav>
    </header>
  );
}
