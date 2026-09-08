import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pieces, users } from "@/lib/db/schema";
import type { PieceWithAuthor } from "@/lib/db/queries/pieces";

/**
 * Author profile lookup by username (URL-safe slug). Public — used by
 * app/(public)/authors/[username]. Returns null if no such user.
 */
export async function getUserByUsername(username: string) {
  return (
    (await db.query.users.findFirst({
      where: eq(users.username, username),
    })) ?? null
  );
}

/**
 * Public pieces by a single author — approved + public only, newest first.
 * Author profile pages never expose drafts, rejected, or group-only work.
 */
export async function getPublishedPiecesByAuthor(
  authorId: string,
  opts?: { limit?: number; offset?: number },
): Promise<PieceWithAuthor[]> {
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;

  const rows = await db.query.pieces.findMany({
    where: and(
      eq(pieces.authorId, authorId),
      eq(pieces.visibility, "public"),
      eq(pieces.reviewStatus, "approved"),
    ),
    with: { author: true },
    orderBy: [desc(pieces.publishedAt), desc(pieces.createdAt)],
    limit,
    offset,
  });

  return rows as PieceWithAuthor[];
}
