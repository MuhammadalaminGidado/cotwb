import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClerkUserMenu } from "@/components/user-menu";
import { SearchDropdown } from "@/components/search-dropdown";
import { SearchInput } from "@/components/search-input";
import { canModerate, currentUser } from "@/lib/auth";
import { hasClerk } from "@/lib/clerk-config";
import { generateSecuredSearchKey, hasAlgolia } from "@/lib/search/algolia";
import { UserNavDropdown } from "@/components/user-nav-dropdown";

function SearchSlot({ secured, autocomplete = true }: { secured: Awaited<ReturnType<typeof generateSecuredSearchKey>>; autocomplete?: boolean }) {
  if (secured && autocomplete) {
    return (
      <SearchDropdown
        appId={secured.appId}
        apiKey={secured.securedKey}
        indexName={secured.indexName}
        filters={secured.filters}
      />
    );
  }
  if (secured && !autocomplete) {
    return <SearchInput />;
  }
  return (
    <div role="alert" className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-medium text-text-primary">
      Search unavailable
    </div>
  );
}

function NavLinks({ mobile }: { mobile?: boolean }) {
  const cls = mobile ? "text-sm font-medium text-text-muted" : "text-sm font-medium text-text-muted transition-colors hover:text-text-primary";
  return (
    <>
      <Link href="/" className={cls}>
        Home
      </Link>
      <Link href="/write/new" className={cls}>
        Write
      </Link>
    </>
  );
}

export async function SiteHeader() {
  const user = await currentUser();
  const clerkReady = hasClerk();
  const secured = hasAlgolia() ? await generateSecuredSearchKey(user) : null;

  return (
    <header className="sticky top-3 z-10 px-4">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 rounded-full border border-border bg-surface/80 px-4 py-2 shadow-sm backdrop-blur">
        <div className="flex items-center gap-6 shrink-0">
          <Link href="/" className="font-serif text-lg font-semibold tracking-tight text-text-primary" title="Chip of the Writer's Block">
            COTWB
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            <NavLinks />
          </nav>
        </div>

        <div className="hidden flex-1 justify-center sm:flex">
          <div className="w-full max-w-[min(680px,55vw)]">
            <SearchSlot secured={secured} />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-text-muted sm:inline">{user.username}</span>
              {clerkReady ? <ClerkUserMenu /> : null}
              <UserNavDropdown isAdmin={canModerate(user)} />
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

      <div className="mx-auto mt-2 w-full max-w-5xl rounded-2xl border border-border bg-surface/80 px-4 py-2 shadow-sm backdrop-blur sm:hidden">
        <SearchSlot secured={secured} autocomplete={false} />
      </div>

      <nav className="mx-auto mt-2 flex w-full max-w-5xl items-center gap-6 rounded-full border border-border bg-surface/80 px-6 py-2 shadow-sm backdrop-blur sm:hidden">
        <NavLinks mobile />
      </nav>
    </header>
  );
}
