import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-bg px-6 py-16">
      <main className="flex w-full max-w-2xl flex-col gap-8 rounded-xl border border-border bg-surface p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Literary Community
          </h1>
          <ThemeToggle />
        </div>
        <p className="text-base leading-6 text-text-muted">
          A place for writers and readers. Theming foundation is active — toggle
          above to verify light and dark tokens.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-bg p-4">
            <p className="text-sm font-medium text-text-primary">Background</p>
            <p className="text-xs text-text-muted">bg-bg</p>
          </div>
          <div className="rounded-lg border border-border bg-accent p-4">
            <p className="text-sm font-medium text-accent-contrast">Accent</p>
            <p className="text-xs text-accent-contrast opacity-80">bg-accent</p>
          </div>
          <div className="rounded-lg border border-border bg-danger p-4">
            <p className="text-sm font-medium text-accent-contrast">Danger</p>
            <p className="text-xs text-accent-contrast opacity-80">bg-danger</p>
          </div>
          <div className="rounded-lg border border-border bg-success p-4">
            <p className="text-sm font-medium text-accent-contrast">Success</p>
            <p className="text-xs text-accent-contrast opacity-80">bg-success</p>
          </div>
        </div>
      </main>
    </div>
  );
}
