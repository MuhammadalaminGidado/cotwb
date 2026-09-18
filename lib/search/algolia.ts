import { algoliasearch } from "algoliasearch";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pieces, users } from "@/lib/db/schema";
import type { LocalUser } from "@/lib/auth";
import { getViewerGroupIds } from "@/lib/db/queries/shared";
import type { PieceWithAuthor } from "@/lib/db/queries/pieces";

export type AlgoliaPieceRecord = {
  objectID: string;
  title: string;
  body: string;
  slug: string;
  authorId: string;
  authorUsername: string;
  visibility: string;
  reviewStatus: string;
  publishedAt: number | null;
  createdAt: number;
};

export type SearchResult = PieceWithAuthor & {
  rank: number;
  headline: string | null;
};

function hasAlgolia(): boolean {
  // Search can use either admin or search-only key
  return Boolean(
    process.env.ALGOLIA_APP_ID &&
      (process.env.ALGOLIA_ADMIN_API_KEY || process.env.ALGOLIA_SEARCH_API_KEY || process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY),
  );
}

function hasAlgoliaAdmin(): boolean {
  return Boolean(process.env.ALGOLIA_APP_ID && process.env.ALGOLIA_ADMIN_API_KEY);
}

function getIndexName(): string {
  if (process.env.ALGOLIA_INDEX_NAME) return process.env.ALGOLIA_INDEX_NAME;
  const env = process.env.NODE_ENV || "development";
  return `cotwb_pieces_${env}`;
}

function getAdminClient() {
  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey = process.env.ALGOLIA_ADMIN_API_KEY;
  if (!appId || !apiKey) throw new Error("Algolia admin not configured");
  return algoliasearch(appId, apiKey);
}

function getSearchClient() {
  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey =
    process.env.ALGOLIA_SEARCH_API_KEY ||
    process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY ||
    process.env.ALGOLIA_ADMIN_API_KEY;
  if (!appId || !apiKey) throw new Error("Algolia not configured");
  return algoliasearch(appId, apiKey);
}

// Keep getClient as alias to admin for backwards compat
function getClient() {
  return getAdminClient();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

function buildRecord(piece: typeof pieces.$inferSelect, author: typeof users.$inferSelect): AlgoliaPieceRecord {
  return {
    objectID: piece.id,
    title: piece.title,
    body: stripHtml(piece.body),
    slug: piece.slug,
    authorId: piece.authorId,
    authorUsername: author.username,
    visibility: piece.visibility,
    reviewStatus: piece.reviewStatus,
    publishedAt: piece.publishedAt ? Math.floor(piece.publishedAt.getTime() / 1000) : null,
    createdAt: Math.floor(piece.createdAt.getTime() / 1000),
  };
}

export async function upsertPieceToAlgolia(pieceId: string): Promise<void> {
  if (!hasAlgoliaAdmin()) return;
  const row = await db.query.pieces.findFirst({
    where: eq(pieces.id, pieceId),
    with: { author: true },
  });
  if (!row) return;
  const record = buildRecord(row, row.author);
  const client = getAdminClient();
  await client.saveObject({ indexName: getIndexName(), body: record as unknown as Record<string, unknown> });
}

export async function deletePieceFromAlgolia(pieceId: string): Promise<void> {
  if (!hasAlgoliaAdmin()) return;
  const client = getAdminClient();
  await client.deleteObject({ indexName: getIndexName(), objectID: pieceId });
}

export async function searchAlgolia(
  rawQuery: string,
  viewer: LocalUser | null,
  opts?: { limit?: number; offset?: number },
): Promise<SearchResult[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];
  if (!hasAlgolia()) throw new Error("Algolia not configured");

  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;
  const page = Math.floor(offset / limit);

  const groupIds = await getViewerGroupIds(viewer);
  const isAdmin = viewer?.role === "admin";

  let filters = "";
  if (!isAdmin) {
    if (!viewer) {
      filters = "reviewStatus:approved AND visibility:public";
    } else {
      // Algolia forbids (A AND B) OR C — rewrite A OR (B AND C) as (A OR B) AND (A OR C)
      const author = `authorId:${viewer.id}`;
      if (groupIds.length > 0) {
        filters = `(${author} OR reviewStatus:approved) AND (${author} OR visibility:public OR visibility:group)`;
      } else {
        filters = `(${author} OR reviewStatus:approved) AND (${author} OR visibility:public)`;
      }
    }
  }

  const client = getSearchClient();
  const res = await client.searchSingleIndex<AlgoliaPieceRecord>({
    indexName: getIndexName(),
    searchParams: {
      query: q,
      filters: filters || undefined,
      hitsPerPage: limit,
      page,
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
      attributesToHighlight: ["body", "title"],
    } as unknown as Record<string, unknown>,
  });

  const hits = (res.hits as unknown as Array<AlgoliaPieceRecord & { _highlightResult?: { body?: { value: string }; title?: { value: string } }; _rankingInfo?: { nbTypos?: number } }>) ?? [];
  if (hits.length === 0) return [];

  // Hydrate full pieces + author from DB to keep viewer-aware data fresh and return PieceWithAuthor shape.
  const ids = hits.map((h) => h.objectID);
  // Fetch hydrated rows — use inArray via eq+or for simplicity, or single query per id.
  // Use `inArray` helper from drizzle-orm if available; fallback to manual OR.
  const { inArray } = await import("drizzle-orm");
  const hydrated = await db.query.pieces.findMany({
    where: inArray(pieces.id, ids),
    with: { author: true },
  });
  const byId = new Map(hydrated.map((p) => [p.id, p as PieceWithAuthor]));

  // Preserve Algolia ranking order, attach headline highlight.
  return hits
    .map((hit, idx) => {
      const piece = byId.get(hit.objectID);
      if (!piece) return null;
      const headline = hit._highlightResult?.body?.value ?? null;
      return {
        ...piece,
        rank: hits.length - idx, // preserve order; Algolia relevance already sorted
        headline,
      } as SearchResult;
    })
    .filter(Boolean) as SearchResult[];
}

export async function configureAlgoliaIndex(): Promise<void> {
  if (!hasAlgoliaAdmin()) return;
  const client = getAdminClient();
  // setSettings — best practice: filterOnly avoids facet computation overhead
  await client.setSettings({
    indexName: getIndexName(),
    indexSettings: {
      searchableAttributes: ["title", "body"],
      attributesForFaceting: ["filterOnly(visibility)", "filterOnly(reviewStatus)", "filterOnly(authorId)"],
      customRanking: ["desc(publishedAt)", "desc(createdAt)"],
      ranking: ["typo", "words", "filters", "proximity", "attribute", "exact", "custom"],
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
      hitsPerPage: 10,
    } as unknown as Record<string, unknown>,
  });
}

export async function getFiltersForViewer(viewer: LocalUser | null): Promise<string> {
  const groupIds = await getViewerGroupIds(viewer);
  const isAdmin = viewer?.role === "admin";
  if (isAdmin) return "";
  if (!viewer) return "reviewStatus:approved AND visibility:public";
  const author = `authorId:${viewer.id}`;
  if (groupIds.length > 0) {
    return `(${author} OR reviewStatus:approved) AND (${author} OR visibility:public OR visibility:group)`;
  }
  return `(${author} OR reviewStatus:approved) AND (${author} OR visibility:public)`;
}

export function getSearchCredentials(): { appId: string; searchKey: string; indexName: string } | null {
  const appId = process.env.ALGOLIA_APP_ID;
  const searchKey =
    process.env.ALGOLIA_SEARCH_API_KEY ||
    process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY ||
    process.env.ALGOLIA_ADMIN_API_KEY;
  const indexName = getIndexName();
  if (!appId || !searchKey) return null;
  return { appId, searchKey, indexName };
}

export async function generateSecuredSearchKey(
  viewer: LocalUser | null,
): Promise<{ securedKey: string; filters: string; indexName: string; appId: string } | null> {
  const creds = getSearchCredentials();
  if (!creds) return null;
  const filters = await getFiltersForViewer(viewer);
  // If no filters (admin), return plain key — no restriction needed
  if (!filters) {
    return { securedKey: creds.searchKey, filters, indexName: creds.indexName, appId: creds.appId };
  }
  try {
    const client = getSearchClient() as unknown as { generateSecuredApiKey: (opts: unknown) => string };
    // Secured key with filters + 1h expiry (Algolia expects validUntil in seconds)
    const validUntil = Math.floor(Date.now() / 1000) + 3600;
    const securedKey = client.generateSecuredApiKey({
      parentApiKey: creds.searchKey,
      restrictions: { filters, validUntil } as unknown as Record<string, unknown>,
    });
    return { securedKey, filters, indexName: creds.indexName, appId: creds.appId };
  } catch {
    // Fallback to plain key + client-side Configure filters if generation fails
    return { securedKey: creds.searchKey, filters, indexName: creds.indexName, appId: creds.appId };
  }
}

export { hasAlgolia, hasAlgoliaAdmin, getIndexName, getClient, getAdminClient, getSearchClient, stripHtml, buildRecord };
