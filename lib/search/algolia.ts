import { algoliasearch } from "algoliasearch";
import { eq, inArray } from "drizzle-orm";
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
  // Browser-visible search must use search-only key, never admin (prevents write ACL leak)
  return Boolean(
    process.env.ALGOLIA_APP_ID &&
      (process.env.ALGOLIA_SEARCH_API_KEY || process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY),
  );
}

function hasAlgoliaAdmin(): boolean {
  return Boolean(process.env.ALGOLIA_APP_ID && process.env.ALGOLIA_ADMIN_API_KEY);
}

function getIndexName(): string {
  if (process.env.ALGOLIA_INDEX_NAME) return process.env.ALGOLIA_INDEX_NAME;
  return `cotwb_pieces_${process.env.NODE_ENV || "development"}`;
}

function getAdminClient() {
  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey = process.env.ALGOLIA_ADMIN_API_KEY;
  if (!appId || !apiKey) throw new Error("Algolia admin not configured");
  return algoliasearch(appId, apiKey);
}

function getSearchClient() {
  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey = process.env.ALGOLIA_SEARCH_API_KEY || process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
  if (!appId || !apiKey) throw new Error("Algolia not configured");
  return algoliasearch(appId, apiKey);
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
  const filters = await getFiltersForViewer(viewer);

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
    },
  });

  const hits =
    (res.hits as Array<AlgoliaPieceRecord & { _highlightResult?: { body?: { value: string } }; _rankingInfo?: { nbTypos?: number } }>) ??
    [];
  if (hits.length === 0) return [];

  const ids = hits.map((h) => h.objectID);
  const hydrated = await db.query.pieces.findMany({
    where: inArray(pieces.id, ids),
    with: { author: true },
  });
  const byId = new Map(hydrated.map((p) => [p.id, p as PieceWithAuthor]));

  return hits
    .map((hit, idx) => {
      const piece = byId.get(hit.objectID);
      if (!piece) return null;
      return { ...piece, rank: hits.length - idx, headline: hit._highlightResult?.body?.value ?? null } as SearchResult;
    })
    .filter(Boolean) as SearchResult[];
}

export async function configureAlgoliaIndex(): Promise<void> {
  if (!hasAlgoliaAdmin()) return;
  const client = getAdminClient();
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
    },
  });
}

export function getSearchCredentials(): { appId: string; searchKey: string; indexName: string } | null {
  const appId = process.env.ALGOLIA_APP_ID;
  const searchKey = process.env.ALGOLIA_SEARCH_API_KEY || process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
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
  if (!filters) {
    return { securedKey: creds.searchKey, filters, indexName: creds.indexName, appId: creds.appId };
  }
  try {
    const client = getSearchClient() as unknown as { generateSecuredApiKey: (opts: unknown) => string };
    const validUntil = Math.floor(Date.now() / 1000) + 3600;
    const securedKey = client.generateSecuredApiKey({
      parentApiKey: creds.searchKey,
      restrictions: { filters, validUntil },
    });
    return { securedKey, filters, indexName: creds.indexName, appId: creds.appId };
  } catch {
    // Fail closed — do not expose plain search key with client-side filters that can be dropped
    return null;
  }
}

export { hasAlgolia, hasAlgoliaAdmin, getIndexName, getAdminClient, getSearchClient, stripHtml, buildRecord };
