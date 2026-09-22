"use client";

/* eslint-disable react-hooks/set-state-in-effect -- debounced search reset + selection reset are intentional sync updates */

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { liteClient } from "algoliasearch/lite";
import { sanitizePieceBody } from "@/lib/sanitize";

type Props = {
  appId: string;
  apiKey: string;
  indexName: string;
  filters: string;
};

type Hit = {
  objectID: string;
  title: string;
  slug: string;
  authorUsername: string;
  _highlightResult?: { title?: { value: string } };
};

export function SearchDropdown({ appId, apiKey, indexName, filters }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seqRef = useRef(0);
  const listId = useId();

  const searchClient = useMemo(() => liteClient(appId, apiKey), [appId, apiKey]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSelected(-1);
      setError(false);
      setLoading(false);
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    const seq = ++seqRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await searchClient.search([
          {
            indexName,
            params: {
              query: q,
              hitsPerPage: 5,
              filters: filters || undefined,
              highlightPreTag: "<mark>",
              highlightPostTag: "</mark>",
            },
          },
        ]);
        if (seqRef.current !== seq) return;
        const first = res.results[0] as unknown as { hits?: Hit[] };
        const list = (first?.hits ?? []) as Hit[];
        setHits(list.map((h) => ({ ...h })));
        setSelected(-1);
        setError(false);
      } catch (e) {
        if (seqRef.current !== seq) return;
        console.error("[search] dropdown query failed", e);
        setHits([]);
        setError(true);
      } finally {
        if (seqRef.current === seq) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, filters, indexName, searchClient]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open ]);



  const showPanel = open && query.trim().length >= 2;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setSelected((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && selected >= 0 && hits[selected]) {
      e.preventDefault();
      router.push(`/pieces/${hits[selected].slug}`);
    } else if (e.key === "Escape") {
      setOpen(false);
      setSelected(-1);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        <label htmlFor="header-search" className="sr-only">
          Search pieces
        </label>
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-accent-primary" aria-hidden>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          ref={inputRef}
          id="header-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search…"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-activedescendant={selected >= 0 && hits[selected] ? `search-hit-${hits[selected].objectID}` : undefined}
          autoComplete="off"
          spellCheck={false}
          className="h-8 w-full rounded-full border border-border bg-bg py-1 pl-8 pr-8 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
        {loading ? (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden>
            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent-primary motion-reduce:animate-none" />
          </span>
        ) : null}
      </div>
      <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 text-[11px] text-text-muted sm:flex" aria-hidden>
        Powered by Algolia
      </span>
      {showPanel ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[20rem] max-w-[90vw] overflow-hidden rounded-xl border border-border bg-surface shadow-xl sm:w-[28rem]">
          {error ? (
            <div role="alert" className="px-3 py-4 text-center text-sm text-text-muted">
              Search failed. <span className="font-medium text-accent-primary">Try again</span>
            </div>
          ) : hits.length === 0 && !loading ? (
            <div className="px-3 py-4 text-center text-sm text-text-muted">
              No results. <span className="font-medium text-accent-primary">See all results</span>
            </div>
          ) : (
            <ul id={listId} role="listbox" aria-label="Search suggestions">
              {hits.map((hit, idx) => (
                <li key={hit.objectID} id={`search-hit-${hit.objectID}`} role="option" aria-selected={idx === selected}>
                  <Link
                    href={`/pieces/${hit.slug}`}
                    onMouseEnter={() => setSelected(idx)}
                    onFocus={() => setSelected(idx)}
                    className={`block px-3 py-2 transition-colors hover:bg-bg aria-[selected=true]:bg-bg ${idx === selected ? "bg-bg" : ""}`}
                  >
                    <span
                      className="block font-serif text-sm font-semibold text-text-primary [&_mark]:rounded-sm [&_mark]:bg-accent-primary/15 [&_mark]:px-0.5 [&_mark]:text-text-primary"
                      dangerouslySetInnerHTML={{
                        __html: sanitizePieceBody(hit._highlightResult?.title?.value ?? hit.title),
                      }}
                    />
                    <span className="mt-0.5 block text-xs text-text-muted">by {hit.authorUsername}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border px-3 py-2 text-right">
            <button
              type="button"
              onClick={() => router.push(`/search?q=${encodeURIComponent(query.trim())}`)}
              className="text-xs font-medium text-accent-primary hover:text-accent-primary-light"
            >
              See all results for “{query.trim()}” →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
