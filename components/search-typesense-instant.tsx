"use client";

/* eslint-disable react-hooks/set-state-in-effect -- debounced search reset + selection reset are intentional sync updates */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Typesense from "typesense";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

type Props = {
  host: string;
  port: number;
  protocol: string;
  apiKey: string;
  collection: string;
  filterBy: string;
  initialQuery: string;
};

type Hit = {
  id: string;
  title: string;
  slug: string;
  authorUsername: string;
  highlight?: Record<string, string>;
  body?: string;
};

function Highlight({ hit, attribute }: { hit: Hit; attribute: string }) {
  const value = hit.highlight?.[attribute] ?? hit[attribute as keyof Hit] ?? "";
  // Typesense highlight already contains <mark> from highlight_full_fields
  return <span dangerouslySetInnerHTML={{ __html: String(value) }} className="[&_mark]:rounded-sm [&_mark]:bg-accent-primary/15 [&_mark]:px-0.5 [&_mark]:text-text-primary" />;
}

export function SearchTypesenseInstant({ host, port, protocol, apiKey, collection, filterBy, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const searchClient = useMemo(
    () =>
      new Typesense.Client({
        nodes: [{ host, port, protocol }],
        apiKey,
        connectionTimeoutSeconds: 2,
      }),
    [host, port, protocol, apiKey],
  );

  // Debounced search ~250ms, cancel in-flight
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setError(null);
      setLoading(false);
      if (abortRef.current) abortRef.current.abort();
      return;
    }
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = controller;
    const timer = setTimeout(async () => {
      try {
        const res = await searchClient
          .collections(collection)
          .documents()
          .search(
            {
              q,
              query_by: "title,body",
              query_by_weights: "2,1",
              filter_by: filterBy || undefined,
              sort_by: "publishedAt:desc,createdAt:desc",
              per_page: 10,
              page: 1,
              highlight_full_fields: "title,body",
              highlight_affix_num_tokens: 4,
            },
            { signal: controller.signal } as unknown as Record<string, unknown>,
          );
        const r = res as unknown as { hits?: Array<{ document: Hit; highlight?: Record<string, string>; highlights?: Array<{ field: string; snippet: string }> }> };
        const mapped =
          r.hits?.map((h) => {
            const doc = h.document as Hit;
            const hl: Record<string, string> = {};
            for (const hh of h.highlights ?? []) hl[hh.field] = hh.snippet;
            // Fallback to highlight.full_fields if highlights empty
            if (Object.keys(hl).length === 0 && (h as unknown as { highlight?: Record<string, string> }).highlight) {
              Object.assign(hl, (h as unknown as { highlight: Record<string, string> }).highlight);
            }
            return { ...doc, highlight: hl } as Hit;
          }) ?? [];
        if (!controller.signal.aborted) {
          setHits(mapped);
          setLoading(false);
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        console.error("[typesense] search failed", e);
        if (!controller.signal.aborted) {
          setError("Search is temporarily unavailable — try again.");
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, filterBy, collection, searchClient]);

  // Keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      const hit = hits[selectedIndex];
      if (hit) router.push(`/pieces/${hit.slug}`);
    } else if (e.key === "Escape") {
      setHits([]);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    setSelectedIndex(-1);
  }, [hits]);

  const showEmpty = query.trim().length === 0;
  const showTooShort = query.trim().length > 0 && query.trim().length < 2;
  const showNoResults = !loading && !error && query.trim().length >= 2 && hits.length === 0;

  return (
    <div className="mt-6">
      <div role="search" aria-label="Search pieces" className="relative">
        <label htmlFor="typesense-search" className="sr-only">
          Search pieces
        </label>
        <input
          ref={inputRef}
          id="typesense-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search…"
          aria-label="Search pieces"
          aria-autocomplete="list"
          aria-controls="typesense-listbox"
          aria-activedescendant={selectedIndex >= 0 ? `hit-${hits[selectedIndex]?.id}` : undefined}
          role="combobox"
          aria-expanded={hits.length > 0}
          className="h-10 w-full rounded-full border border-border bg-bg py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-accent-primary" aria-hidden>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
      </div>

      {loading ? (
        <div className="mt-4 space-y-4" aria-busy="true" aria-live="polite">
          <Skeleton className="h-24 w-full rounded-xl" />
          <SkeletonText lines={2} />
        </div>
      ) : error ? (
        <div role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-6 text-center">
          <p className="text-sm text-text-primary">{error}</p>
          <button
            type="button"
            onClick={() => setQuery((q) => q)}
            className="mt-3 inline-flex rounded-full bg-accent-primary px-4 py-1.5 text-sm font-medium text-text-inverse"
          >
            Retry
          </button>
        </div>
      ) : showEmpty ? (
        <div className="mt-4 rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">Type at least 2 characters to search.</p>
          <p className="mt-1 text-xs text-text-muted opacity-70">Try “poetry”, “fiction”, or a phrase from a title.</p>
        </div>
      ) : showTooShort ? (
        <div className="mt-4 rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">Type at least 2 characters.</p>
        </div>
      ) : showNoResults ? (
        <div className="mt-4 rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">
            No results for “<span className="font-medium text-text-primary">{query}</span>”.
          </p>
          <Link href="/" className="mt-3 inline-flex text-sm font-medium text-accent-primary hover:text-accent-primary-light">
            Browse latest pieces
          </Link>
        </div>
      ) : (
        <ul
          id="typesense-listbox"
          ref={listRef}
          role="listbox"
          aria-label="Search results"
          className="mt-4 space-y-4"
        >
          {hits.map((hit, idx) => (
            <li
              key={hit.id}
              id={`hit-${hit.id}`}
              role="option"
              aria-selected={idx === selectedIndex}
              className={`rounded-xl border p-6 ${idx === selectedIndex ? "border-accent-primary bg-accent-primary/10" : "border-border bg-surface hover:bg-bg"}`}
            >
              <Link
                href={`/pieces/${hit.slug}`}
                className="group block"
                onFocus={() => setSelectedIndex(idx)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <h2 className="font-serif text-lg font-semibold text-text-primary group-hover:text-accent-primary">
                  <Highlight hit={hit} attribute="title" />
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-text-muted [&_mark]:rounded-sm [&_mark]:bg-accent-primary/15 [&_mark]:px-0.5">
                  <Highlight hit={hit} attribute="body" />
                </p>
              </Link>
              <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                <Link href={`/authors/${hit.authorUsername}`} className="font-medium hover:text-text-primary">
                  {hit.authorUsername}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
