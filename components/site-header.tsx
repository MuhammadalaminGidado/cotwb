import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClerkUserMenu } from "@/components/user-menu";
import { SearchInput } from "@/components/search-input";
import { SearchAutocomplete } from "@/components/search-autocomplete";
import { canModerate, currentUser } from "@/lib/auth";
import { hasClerk } from "@/lib/clerk-config";
import { generateSecuredSearchKey, hasAlgolia } from "@/lib/search/algolia";

function SearchSlot({ secured }: { secured: Awaited<ReturnType<typeof generateSecuredSearchKey>> }) {
  return secured ? (
    <SearchAutocomplete appId={secured.appId} apiKey={secured.securedKey} indexName={secured.indexName} filters={secured.filters} />
  ) : (
    <SearchInput />
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
  const secured = hasAlgolia() ? await generateSecuredSearchKey(user) : null;

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-serif text-lg font-semibold tracking-tight text-text-primary" title="Chip of the Writer's Block">
            COTWB
          </Link>
          <nav className="hidden items-center gap-4 sm:flex">
            <NavLinks isAdmin={canModerate(user)} isAuthed={!!user} />
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <SearchSlot secured={secured} />
          </div>
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
        <SearchSlot secured={secured} />
      </div>

      <nav className="flex items-center gap-4 border-t border-border px-6 py-2 sm:hidden">
        <NavLinks isAdmin={canModerate(user)} isAuthed={!!user} mobile />
      </nav>
    </header>
  );
}
