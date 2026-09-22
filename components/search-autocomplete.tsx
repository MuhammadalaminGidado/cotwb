"use client";

import { createElement, Fragment, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useRouter } from "next/navigation";
import { autocomplete } from "@algolia/autocomplete-js";
import { getAlgoliaResults } from "@algolia/autocomplete-preset-algolia";
import { liteClient } from "algoliasearch/lite";

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
};

export function SearchAutocomplete({ appId, apiKey, indexName, filters }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const baseClient = useMemo(() => liteClient(appId, apiKey), [appId, apiKey]);
  const searchClient = useMemo(
    () => ({
      ...baseClient,
      search: ((...args: Parameters<typeof baseClient.search>) =>
        (baseClient.search as unknown as (...a: unknown[]) => Promise<unknown>)(...args).then((res) => structuredClone(res as object))) as typeof baseClient.search,
    }),
    [baseClient],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const instance = autocomplete<Hit>({
      container,
      placeholder: "Search…",
      openOnFocus: true,
      detachedMediaQuery: "none",
      renderer: {
        createElement,
        Fragment,
        render: (vnode, root) => {
          const r = root as HTMLElement & { _reactRoot?: ReturnType<typeof createRoot> };
          if (!r._reactRoot) r._reactRoot = createRoot(r);
          r._reactRoot.render(vnode as React.ReactNode);
        },
      },
      getSources({ query }) {
        if (query.trim().length < 2) return [];
        return [
          {
            sourceId: "pieces",
            getItems() {
              return getAlgoliaResults<Hit>({
                searchClient,
                queries: [
                  {
                    indexName,
                    params: {
                      query,
                      hitsPerPage: 5,
                      filters: filters || undefined,
                      highlightPreTag: "<mark>",
                      highlightPostTag: "</mark>",
                    },
                  },
                ],
              });
            },
            getItemUrl({ item }) {
              return `/pieces/${item.slug}`;
            },
            onSelect({ item }) {
              router.push(`/pieces/${item.slug}`);
            },
            templates: {
              item({ item, components }) {
                return (
                  <div className="flex flex-col gap-1">
                    <div className="font-serif text-sm font-semibold text-text-primary">
                      <components.Highlight hit={item} attribute="title" />
                    </div>
                    <div className="text-xs text-text-muted">by {item.authorUsername}</div>
                  </div>
                );
              },
              noResults() {
                return (
                  <div className="px-3 py-4 text-center text-sm text-text-muted">
                    No results. <span className="font-medium text-accent-primary">See all results</span>
                  </div>
                );
              },
              footer({ state }) {
                const q = (state as { query?: string }).query ?? "";
                if (!q || q.trim().length < 2) return null as unknown as string;
                return (
                  <div className="border-t border-border px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => router.push(`/search?q=${encodeURIComponent(q)}`)}
                      className="text-xs font-medium text-accent-primary hover:text-accent-primary-light"
                    >
                      See all results for “{q}” →
                    </button>
                  </div>
                ) as unknown as string;
              },
            },
          },
        ];
      },
      classNames: {
        root: "aa-Autocomplete",
        form: "aa-Form !relative !h-8 !flex !items-center !rounded-full !border !border-border !bg-bg focus-within:!border-accent-primary focus-within:!ring-1 focus-within:!ring-accent-primary",
        input:
          "aa-Input !h-8 !pl-8 !pr-8 !text-sm !text-text-primary placeholder:!text-text-muted !bg-transparent [--aa-search-input-height:32px] [--aa-icon-size:16px]",
        submitButton: "aa-SubmitButton !absolute !left-2.5 !top-1/2 !-translate-y-1/2 !h-4 !w-4 !p-0 !bg-transparent pointer-events-none !text-accent-primary [&_svg]:!h-4 [&_svg]:!w-4 [&_svg]:!text-accent-primary",
        clearButton: "aa-ClearButton !absolute !right-2 !top-1/2 !-translate-y-1/2 !h-4 !w-4 !p-0 !bg-transparent !text-text-muted hover:!text-text-primary [&_svg]:!h-4 [&_svg]:!w-4",
        panel:
          "aa-Panel !absolute !left-0 !top-full !mt-2 !w-full !min-w-[20rem] !max-w-[90vw] sm:!w-[28rem] !rounded-xl !border !border-border !bg-surface !shadow-xl !z-50 !overflow-hidden motion-reduce:transition-none",
        item: "aa-Item !px-3 !py-2 hover:!bg-bg aria-[selected=true]:!bg-bg cursor-pointer",
      },
    });

    return () => {
      try {
        if (container && document.contains(container) && !Object.isFrozen(instance)) {
          instance.destroy();
        } else if (container) {
          container.innerHTML = "";
        }
      } catch {
        if (container) container.innerHTML = "";
      }
    };
  }, [indexName, filters, router, searchClient]);

  return (
    <div className="relative w-full">
      <div ref={containerRef} />
      <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 text-[11px] text-text-muted sm:flex" aria-hidden>
        Powered by {apiKey ? "Algolia" : "Typesense"}
      </span>
    </div>
  );
}
