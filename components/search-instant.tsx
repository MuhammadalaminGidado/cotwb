"use client";

import Link from "next/link";
import { useMemo } from "react";
import { liteClient } from "algoliasearch/lite";
import { InstantSearch, SearchBox, Hits, Highlight, Snippet, Configure, Pagination, useInstantSearch } from "react-instantsearch";

type Props = {
  appId: string;
  apiKey: string;
  indexName: string;
  filters: string;
  initialQuery: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type HitType = {
  objectID: string;
  title: string;
  body: string;
  slug: string;
  authorUsername: string;
  publishedAt: number | null;
  createdAt: number;
};

function Hit({ hit }: { hit: HitType }) {
  const published = hit.publishedAt ? new Date(hit.publishedAt * 1000) : new Date(hit.createdAt * 1000);
  return (
    <article className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-border/80">
      <Link href={`/pieces/${hit.slug}`} className="group block">
        <h2 className="font-serif text-lg font-semibold text-text-primary transition-colors group-hover:text-accent-primary">
          <Highlight attribute="title" hit={hit as never} />
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-text-muted [&_mark]:rounded-sm [&_mark]:bg-accent-primary/15 [&_mark]:px-0.5 [&_mark]:text-text-primary">
          <Snippet attribute="body" hit={hit as never} />
        </p>
      </Link>
      <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
        <Link href={`/authors/${hit.authorUsername}`} className="font-medium transition-colors hover:text-text-primary">
          {hit.authorUsername}
        </Link>
        <span aria-hidden>·</span>
        <time dateTime={published.toISOString()}>{dateFormatter.format(published)}</time>
      </div>
    </article>
  );
}

function EmptyBoundary({ children }: { children: React.ReactNode }) {
  const { results } = useInstantSearch();
  if (results.query.length < 2) {
    return (
      <div className="mt-10 rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-text-muted">Type at least 2 characters to search.</p>
        <p className="mt-1 text-xs text-text-muted opacity-70">Try “poetry”, “fiction”, or a phrase from a title.</p>
      </div>
    );
  }
  if (results.nbHits === 0) {
    return (
      <div className="mt-10 rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-text-muted">
          No results for “<span className="font-medium text-text-primary">{results.query}</span>”.
        </p>
        <Link href="/" className="mt-3 inline-flex text-sm font-medium text-accent-primary hover:text-accent-primary-light">
          Browse latest pieces
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

export function SearchInstant({ appId, apiKey, indexName, filters, initialQuery }: Props) {
  const searchClient = useMemo(() => liteClient(appId, apiKey), [appId, apiKey]);

  return (
    <InstantSearch
      indexName={indexName}
      searchClient={searchClient}
      initialUiState={{ [indexName]: { query: initialQuery } } as never}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <Configure filters={filters || undefined} hitsPerPage={10} highlightPreTag="<mark>" highlightPostTag="</mark>" />
      <div className="mt-6">
        <SearchBox
          placeholder="Search…"
          autoFocus
          searchAsYouType
          classNames={{
            form: "relative",
            input:
              "h-10 w-full rounded-full border border-border bg-bg py-2 pl-4 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary",
            submit: "hidden",
            reset: "hidden",
            loadingIndicator: "hidden",
          }}
        />
      </div>

      <EmptyBoundary>
        <div className="mt-6">
          <Hits hitComponent={Hit as never} classNames={{ list: "space-y-4", item: "list-none" }} />
          <div className="mt-8 flex justify-center">
            <Pagination
              classNames={{
                list: "flex items-center gap-1",
                link: "inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-border bg-surface px-3 text-sm font-medium text-text-muted transition-colors hover:bg-bg hover:text-text-primary",
                selectedItem: "font-semibold",
              }}
              showFirst={false}
              showLast={false}
            />
          </div>
        </div>
      </EmptyBoundary>
    </InstantSearch>
  );
}
