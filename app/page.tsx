import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { currentUser } from "@/lib/auth";

export default async function Home() {
  const user = await currentUser();

  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col items-center justify-center bg-bg px-6 py-16">
        <main className="flex w-full max-w-2xl flex-col gap-8 rounded-xl border border-border bg-surface p-8">
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">
              Chip of the Writer&apos;s Block
            </h1>
            <p className="mt-1 text-xs font-medium tracking-[0.2em] text-text-muted uppercase">
              COTWB
            </p>
          </div>
          <p className="text-base leading-6 text-text-muted">
            A place for writers and readers. Create pieces, share work, and
            discover writing from the COTWB community.
          </p>

          {user ? (
            <div className="flex flex-wrap gap-3">
              <Link
                href="/write/new"
                className="rounded-full bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-light"
              >
                Write a piece
              </Link>
              <Link
                href="/settings"
                className="rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg"
              >
                Settings
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link
                href="/sign-in"
                className="rounded-full bg-accent-primary px-5 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-light"
              >
                Sign in to write
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg"
              >
                Create account
              </Link>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-bg p-4">
              <p className="text-sm font-medium text-text-primary">Background</p>
              <p className="text-xs text-text-muted">bg-bg</p>
            </div>
            <div className="rounded-lg border border-border bg-accent-primary p-4">
              <p className="text-sm font-medium text-text-inverse">Accent Primary</p>
              <p className="text-xs text-text-inverse opacity-80">bg-accent-primary</p>
            </div>
            <div className="rounded-lg border border-border bg-danger p-4">
              <p className="text-sm font-medium text-text-inverse">Danger</p>
              <p className="text-xs text-text-inverse opacity-80">bg-danger</p>
            </div>
            <div className="rounded-lg border border-border bg-success p-4">
              <p className="text-sm font-medium text-text-inverse">Success</p>
              <p className="text-xs text-text-inverse opacity-80">bg-success</p>
            </div>
          </div>

          <p className="text-xs text-text-muted">
            Feed and discovery coming in Phase 5 — approved public pieces will
            appear here.
          </p>
        </main>
      </div>
    </>
  );
}
