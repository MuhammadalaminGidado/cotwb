import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pieces, users } from "@/lib/db/schema";
import type { LocalUser } from "@/lib/auth";
import { getViewerGroupIds } from "@/lib/db/queries/shared";

import type { PieceWithAuthor } from "@/lib/db/queries/pieces";

export type SearchResult = PieceWithAuthor & {
  rank: number;
  headline: string | null;
};

/**
 * Viewer-aware full-text search.
 * - Uses `pieces.search_vector @@ plainto_tsquery('english', q)` with GIN index.
 * - Title weighted A, body weighted B (defined in schema generated column).
 * - Rank via `ts_rank`, ordered rank desc then publishedAt desc.
 * - Visibility: admin sees all matching; author sees own regardless of status; others see approved+public (+group if member).
 * - Returns [] for queries shorter than 2 chars (avoids plainto_tsquery noise).
 */
export async function searchPieces(
  rawQuery: string,
  viewer: LocalUser | null,
  opts?: { limit?: number; offset?: number },
): Promise<SearchResult[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];

  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;

  const groupIds = await getViewerGroupIds(viewer);
  const isAdmin = viewer?.role === "admin";

  // plainto_tsquery is safely parameterized via sql template
  const match = sql`pieces.search_vector @@ plainto_tsquery('english', ${q})`;
  const rankExpr = sql<number>`ts_rank(pieces.search_vector, plainto_tsquery('english', ${q}))`;
  const headlineExpr = sql<string>`ts_headline('english', pieces.body, plainto_tsquery('english', ${q}), 'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, ShortWord=3, HighlightAll=false, MaxFragments=2, FragmentDelimiter= … ')`;

  let whereClause;
  if (isAdmin) {
    // Admin bypasses visibility/reviewStatus — sees everything matching
    whereClause = match;
  } else if (viewer) {
    const visibilityFilter =
      groupIds.length > 0
        ? or(eq(pieces.visibility, "public"), eq(pieces.visibility, "group"))
        : eq(pieces.visibility, "public");

    // Author row bypasses reviewStatus/visibility; everyone else must be approved+visible
    whereClause = and(
      match,
      or(
        eq(pieces.authorId, viewer.id),
        and(eq(pieces.reviewStatus, "approved"), visibilityFilter),
      ),
    );
  } else {
    // Anon: only approved+public
    whereClause = and(match, eq(pieces.reviewStatus, "approved"), eq(pieces.visibility, "public"));
  }

  const rows = await db
    .select({
      piece: pieces,
      author: users,
      rank: rankExpr,
      headline: headlineExpr,
    })
    .from(pieces)
    .innerJoin(users, eq(pieces.authorId, users.id))
    .where(whereClause)
    .orderBy(desc(rankExpr), desc(pieces.publishedAt), desc(pieces.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    ...r.piece,
    author: r.author,
    rank: r.rank,
    headline: r.headline,
  }));
}

export async function searchPiecesCount(rawQuery: string, viewer: LocalUser | null): Promise<number> {
  const q = rawQuery.trim();
  if (q.length < 2) return 0;

  const groupIds = await getViewerGroupIds(viewer);
  const isAdmin = viewer?.role === "admin";
  const match = sql`pieces.search_vector @@ plainto_tsquery('english', ${q})`;

  let whereClause;
  if (isAdmin) {
    whereClause = match;
  } else if (viewer) {
    const visibilityFilter =
      groupIds.length > 0
        ? or(eq(pieces.visibility, "public"), eq(pieces.visibility, "group"))
        : eq(pieces.visibility, "public");
    whereClause = and(
      match,
      or(eq(pieces.authorId, viewer.id), and(eq(pieces.reviewStatus, "approved"), visibilityFilter)),
    );
  } else {
    whereClause = and(match, eq(pieces.reviewStatus, "approved"), eq(pieces.visibility, "public"));
  }

  const rows = await db
    .select({ piece: pieces, author: users })
    .from(pieces)
    .innerJoin(users, eq(pieces.authorId, users.id))
    .where(whereClause);

  return rows.length;
}
