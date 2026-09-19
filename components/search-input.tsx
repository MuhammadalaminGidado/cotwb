import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export function SearchInput({ defaultValue }: { defaultValue?: string }) {
  return (
    <form
      action="/search"
      method="GET"
      role="search"
      className="flex items-center"
    >
      <label htmlFor="global-search" className="sr-only">
        Search pieces
      </label>
      <div className="relative">
        <MagnifyingGlassIcon
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          aria-hidden
        />
        <input
          id="global-search"
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder="Search…"
          className="h-8 w-40 rounded-full border border-border bg-bg py-1 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary sm:w-56"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </form>
  );
}
