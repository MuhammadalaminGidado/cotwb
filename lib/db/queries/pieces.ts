import { and, count, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pieceTags, pieces, tags, users } from "@/lib/db/schema";
import type { LocalUser } from "@/lib/auth";
import { getViewerGroupIds } from "@/lib/db/queries/shared";

export type PieceWithAuthor = typeof pieces.$inferSelect & {
  author: typeof users.$inferSelect;
};

const publishedWhere = and(eq(pieces.visibility, "public"), eq(pieces.reviewStatus, "approved"));

export function canViewPiece(
  piece: typeof pieces.$inferSelect,
  viewer: LocalUser | null,
  viewerGroupIds: string[],
): boolean {
  if (viewer && (viewer.id === piece.authorId || viewer.role === "admin")) return true;
  if (piece.reviewStatus !== "approved") return false;
  if (piece.visibility === "public") return true;
  if (piece.visibility === "private") return false;
  if (piece.visibility === "group") return !!piece.groupId && viewerGroupIds.includes(piece.groupId);
  return false;
}

export async function getPieceById(pieceId: string, viewer: LocalUser | null): Promise<PieceWithAuthor | null> {
  const piece = await db.query.pieces.findFirst({
    where: eq(pieces.id, pieceId),
    with: { author: true },
  });
  if (!piece) return null;
  const groupIds = await getViewerGroupIds(viewer);
  if (!canViewPiece(piece, viewer, groupIds)) return null;
  return { ...piece, author: { ...piece.author } } as PieceWithAuthor;
}

export async function getPieceBySlug(slug: string, viewer: LocalUser | null): Promise<PieceWithAuthor | null> {
  const piece = await db.query.pieces.findFirst({
    where: eq(pieces.slug, slug),
    with: { author: true },
  });
  if (!piece) return null;
  const groupIds = await getViewerGroupIds(viewer);
  if (!canViewPiece(piece, viewer, groupIds)) return null;
  return { ...piece, author: { ...piece.author } } as PieceWithAuthor;
}

export async function getPublishedPieces(opts?: {
  limit?: number;
  offset?: number;
  tagSlug?: string;
}): Promise<PieceWithAuthor[]> {
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;

  if (opts?.tagSlug) {
    const rows = await db
      .select({ piece: pieces, author: users })
      .from(pieces)
      .innerJoin(users, eq(pieces.authorId, users.id))
      .innerJoin(pieceTags, eq(pieceTags.pieceId, pieces.id))
      .innerJoin(tags, eq(tags.id, pieceTags.tagId))
      .where(and(eq(pieces.visibility, "public"), eq(pieces.reviewStatus, "approved"), eq(tags.slug, opts.tagSlug)))
      .orderBy(desc(pieces.publishedAt), desc(pieces.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map((r) => ({ ...r.piece, author: { ...r.author } }));
  }

  const rows = await db.query.pieces.findMany({
    where: publishedWhere,
    with: { author: true },
    orderBy: [desc(pieces.publishedAt), desc(pieces.createdAt)],
    limit,
    offset,
  });
  return rows.map((r) => ({ ...r, author: { ...r.author } })) as PieceWithAuthor[];
}

export async function getFeedTagCounts(): Promise<{ id: string; name: string; slug: string; count: number }[]> {
  return db
    .select({ id: tags.id, name: tags.name, slug: tags.slug, count: count(pieceTags.pieceId) })
    .from(tags)
    .innerJoin(pieceTags, eq(pieceTags.tagId, tags.id))
    .innerJoin(pieces, and(eq(pieces.id, pieceTags.pieceId), eq(pieces.visibility, "public"), eq(pieces.reviewStatus, "approved")))
    .groupBy(tags.id, tags.name, tags.slug)
    .orderBy(desc(count(pieceTags.pieceId)), tags.slug);
}

export async function getOwnPieces(authorId: string, viewer: LocalUser | null): Promise<PieceWithAuthor[]> {
  if (!viewer || (viewer.id !== authorId && viewer.role !== "admin")) return [];
  const rows = await db.query.pieces.findMany({
    where: eq(pieces.authorId, authorId),
    with: { author: true },
    orderBy: [desc(pieces.updatedAt)],
  });
  return rows.map((r) => ({ ...r, author: { ...r.author } })) as PieceWithAuthor[];
}

export async function getReviewQueuePieces(): Promise<PieceWithAuthor[]> {
  const rows = await db.query.pieces.findMany({
    where: or(eq(pieces.reviewStatus, "submitted"), eq(pieces.reviewStatus, "in_review")),
    with: { author: true },
    orderBy: [desc(pieces.updatedAt)],
  });
  return rows.map((r) => ({ ...r, author: { ...r.author } })) as PieceWithAuthor[];
}

export async function getPieceForEdit(pieceId: string, viewer: LocalUser | null): Promise<PieceWithAuthor | null> {
  if (!viewer) return null;
  const piece = await db.query.pieces.findFirst({
    where: eq(pieces.id, pieceId),
    with: { author: true },
  });
  if (!piece) return null;
  if (piece.authorId !== viewer.id && viewer.role !== "admin") return null;
  return { ...piece, author: { ...piece.author } } as PieceWithAuthor;
}

export async function getVisiblePiecesForViewer(
  viewer: LocalUser | null,
  opts?: { limit?: number; offset?: number },
): Promise<PieceWithAuthor[]> {
  const groupIds = await getViewerGroupIds(viewer);
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;

  if (!viewer || groupIds.length === 0) return getPublishedPieces({ limit, offset });

  const rows = await db.query.pieces.findMany({
    where: and(
      eq(pieces.reviewStatus, "approved"),
      or(eq(pieces.visibility, "public"), and(eq(pieces.visibility, "group"), inArray(pieces.groupId, groupIds))),
    ),
    with: { author: true },
    orderBy: [desc(pieces.publishedAt), desc(pieces.createdAt)],
    limit,
    offset,
  });
  return rows.map((r) => ({ ...r, author: { ...r.author } })) as PieceWithAuthor[];
}
