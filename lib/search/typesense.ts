import { eq, inArray } from "drizzle-orm";
import Typesense from "typesense";
import { db } from "@/lib/db/client";
import { pieces, users } from "@/lib/db/schema";
import type { LocalUser } from "@/lib/auth";
import { getViewerGroupIds } from "@/lib/db/queries/shared";
import type { PieceWithAuthor } from "@/lib/db/queries/pieces";

// Typesense Cloud vs self-hosted — check env before running
// Self-hosted adds docker-compose, Cloud needs only these 3 env vars

export type TypesensePieceRecord = {
  id: string;
  title: string;
  body: string;
  slug: string;
  authorId: string;
  authorUsername: string;
  visibility: string;
  reviewStatus: string;
  groupId: string | null;
  publishedAt: number | null;
  createdAt: number;
};

export type SearchResult = PieceWithAuthor & {
  rank: number;
  highlight: Record<string, string> | null;
};

function hasTypesense(): boolean {
  // Browser search needs a search-only key — admin alone is not enough for client-direct
  return Boolean(
    process.env.TYPESENSE_HOST &&
      (process.env.TYPESENSE_SEARCH_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_KEY),
  );
}

function hasTypesenseAdmin(): boolean {
  return Boolean(process.env.TYPESENSE_HOST && process.env.TYPESENSE_API_KEY);
}

function getCollectionName(): string {
  if (process.env.TYPESENSE_COLLECTION) return process.env.TYPESENSE_COLLECTION;
  const env = process.env.NODE_ENV || "development";
  return `cotwb_pieces_${env}`;
}

function getAdminClient() {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  const port = process.env.TYPESENSE_PORT ? Number(process.env.TYPESENSE_PORT) : 443;
  const protocol = process.env.TYPESENSE_PROTOCOL || "https";
  if (!host || !apiKey) throw new Error("Typesense admin not configured");
  return new Typesense.Client({
    nodes: [{ host, port, protocol }],
    apiKey,
    connectionTimeoutSeconds: 2,
  });
}

function getSearchClient() {
  const host = process.env.TYPESENSE_HOST;
  const apiKey =
    process.env.TYPESENSE_SEARCH_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_KEY || process.env.TYPESENSE_API_KEY;
  const port = process.env.TYPESENSE_PORT ? Number(process.env.TYPESENSE_PORT) : 443;
  const protocol = process.env.TYPESENSE_PROTOCOL || "https";
  if (!host || !apiKey) throw new Error("Typesense not configured");
  return new Typesense.Client({
    nodes: [{ host, port, protocol }],
    apiKey,
    connectionTimeoutSeconds: 2,
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

function buildRecord(piece: typeof pieces.$inferSelect, author: typeof users.$inferSelect): TypesensePieceRecord {
  return {
    id: piece.id,
    title: piece.title,
    body: stripHtml(piece.body),
    slug: piece.slug,
    authorId: piece.authorId,
    authorUsername: author.username,
    visibility: piece.visibility,
    reviewStatus: piece.reviewStatus,
    groupId: piece.groupId ?? null,
    publishedAt: piece.publishedAt ? Math.floor(piece.publishedAt.getTime() / 1000) : 0,
    createdAt: Math.floor(piece.createdAt.getTime() / 1000),
  };
}

// Collection schema — explicit field types, facet, optional, sort
// Typesense collection schema definition (field types based on actual model fields)
export const TYPESENSE_COLLECTION_SCHEMA: Record<string, unknown> = {
  name: getCollectionName(),
  fields: [
    { name: "title", type: "string", facet: false },
    { name: "body", type: "string", facet: false },
    { name: "slug", type: "string", facet: false, index: false, optional: true },
    { name: "authorId", type: "string", facet: true },
    { name: "authorUsername", type: "string", facet: false, optional: true },
    { name: "visibility", type: "string", facet: true },
    { name: "reviewStatus", type: "string", facet: true },
    { name: "groupId", type: "string", facet: true, optional: true },
    { name: "publishedAt", type: "int64", facet: false, optional: true },
    { name: "createdAt", type: "int64", sort: true },
  ],
  default_sorting_field: "createdAt",
};

export async function ensureTypesenseCollection(): Promise<void> {
  if (!hasTypesenseAdmin()) return;
  const client = getAdminClient();
  const name = getCollectionName();
  try {
    await client.collections(name).retrieve();
  } catch {
    await client.collections().create({
      name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fields: TYPESENSE_COLLECTION_SCHEMA.fields as any,
      default_sorting_field: "createdAt",
    });
  }
}

export async function upsertPieceToTypesense(pieceId: string): Promise<void> {
  if (!hasTypesenseAdmin()) return;
  const row = await db.query.pieces.findFirst({
    where: eq(pieces.id, pieceId),
    with: { author: true },
  });
  if (!row) return;
  const record = buildRecord(row, row.author);
  const client = getAdminClient();
  const name = getCollectionName();
  // Use upsert (import with action: upsert) — not delete+recreate
  await client.collections(name).documents().upsert(record as unknown as Record<string, unknown>);
}

export async function deletePieceFromTypesense(pieceId: string): Promise<void> {
  if (!hasTypesenseAdmin()) return;
  const client = getAdminClient();
  const name = getCollectionName();
  try {
    await client.collections(name).documents(pieceId).delete();
  } catch {
    // ignore if not found
  }
}

export async function getFilterByForViewer(viewer: LocalUser | null): Promise<string> {
  const groupIds = await getViewerGroupIds(viewer);
  const isAdmin = viewer?.role === "admin";
  if (isAdmin) return "";
  if (!viewer) return "reviewStatus:approved && visibility:public";
  const author = `authorId:=${viewer.id}`;
  if (groupIds.length > 0) {
    const groupClause = groupIds.map((id) => `groupId:=${id}`).join(" || ");
    return `(${author} || reviewStatus:approved) && (${author} || visibility:public || (visibility:group && (${groupClause})))`;
  }
  return `(${author} || reviewStatus:approved) && (${author} || visibility:public)`;
}

export async function searchTypesense(
  rawQuery: string,
  viewer: LocalUser | null,
  opts?: { limit?: number; offset?: number },
): Promise<SearchResult[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];
  if (!hasTypesense()) throw new Error("Typesense not configured");

  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;
  const page = Math.floor(offset / limit) + 1;
  const filterBy = await getFilterByForViewer(viewer);

  const client = getSearchClient();
  const name = getCollectionName();
  try {
    const res = await client
      .collections(name)
      .documents()
      .search({
        q,
        query_by: "title,body",
        query_by_weights: "2,1",
        filter_by: filterBy || undefined,
        sort_by: "publishedAt:desc,createdAt:desc",
        per_page: limit,
        page,
        highlight_full_fields: "title,body",
        highlight_affix_num_tokens: 4,
        // typo tolerance default is fine for this data (not SKUs/emails)
      });
    const hits = (res.hits ?? []) as Array<{ document: TypesensePieceRecord; highlights?: Array<{ field: string; snippet: string }>; text_match?: number }>;
    if (hits.length === 0) return [];
    const ids = hits.map((h) => h.document.id);
    const hydrated = await db.query.pieces.findMany({
      where: inArray(pieces.id, ids),
      with: { author: true },
    });
    const byId = new Map(hydrated.map((p) => [p.id, p as PieceWithAuthor]));
    return hits
      .map((hit, idx) => {
        const piece = byId.get(hit.document.id);
        if (!piece) return null;
        const highlight: Record<string, string> = {};
        for (const h of hit.highlights ?? []) {
          if (h.snippet) highlight[h.field] = h.snippet;
        }
        return { ...piece, rank: hits.length - idx, highlight } as SearchResult;
      })
      .filter(Boolean) as SearchResult[];
  } catch (e) {
    // Gracefully handle Typesense unavailability — don't break page
    console.error("[typesense] search failed", e);
    throw e;
  }
}

// Scoped search-only key — never expose admin key to client
// Uses Typesense scoped search key generation (HMAC with filter_by + expires)
export async function generateScopedSearchKey(
  viewer: LocalUser | null,
): Promise<{ searchKey: string; filterBy: string; collection: string; host: string; port: number; protocol: string; apiKey: string } | null> {
  const searchKey = process.env.TYPESENSE_SEARCH_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_KEY;
  const host = process.env.TYPESENSE_HOST;
  if (!host || !searchKey) return null;
  const filterBy = await getFilterByForViewer(viewer);
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  try {
    const client = getAdminClient();
    // Typesense scoped key: HMAC of searchKey + filter_by + expires
    const scopedKey = client.keys().generateScopedSearchKey(searchKey, {
      filter_by: filterBy || undefined,
      expires_at: expiresAt,
    } as unknown as Record<string, unknown>);
    return {
      searchKey: scopedKey as unknown as string,
      filterBy,
      collection: getCollectionName(),
      host,
      port: process.env.TYPESENSE_PORT ? Number(process.env.TYPESENSE_PORT) : 443,
      protocol: process.env.TYPESENSE_PROTOCOL || "https",
      apiKey: scopedKey as unknown as string,
    };
  } catch (e) {
    console.error("[typesense] generateScopedSearchKey failed", e);
    return null;
  }
}

export function getTypesenseCredentials(): { host: string; port: number; protocol: string; apiKey: string; collection: string } | null {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_SEARCH_API_KEY || process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_KEY;
  const collection = getCollectionName();
  if (!host || !apiKey) return null;
  return {
    host,
    port: process.env.TYPESENSE_PORT ? Number(process.env.TYPESENSE_PORT) : 443,
    protocol: process.env.TYPESENSE_PROTOCOL || "https",
    apiKey,
    collection,
  };
}

export { hasTypesense, hasTypesenseAdmin, getCollectionName, getAdminClient, getSearchClient, stripHtml, buildRecord };
