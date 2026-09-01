import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { memberships, pieces, users } from "@/lib/db/schema";
import type { LocalUser } from "@/lib/auth";

/**
 * Centralized visibility + reviewStatus filtering.
 * This is the ONLY place that encodes "who can see what".
 * No page or Server Action re-implements this logic inline.
 */

export type PieceWithAuthor = typeof pieces.$inferSelect & {
  author: typeof users.$inferSelect;
};

async function getViewerGroupIds(viewer: LocalUser | null): Promise<string[]> {
  if (!viewer) return [];
  const rows = await db
    .select({ groupId: memberships.groupId })
    .from(memberships)
    .where(eq(memberships.userId, viewer.id));
  return rows.map((r) => r.groupId);
}

/**
 * Returns true if `viewer` can view `piece` given viewer's group memberships.
 * Pure function — no DB access — so it can be used after fetching a piece.
 */
export function canViewPiece(
  piece: typeof pieces.$inferSelect,
  viewer: LocalUser | null,
  viewerGroupIds: string[],
): boolean {
  // Author and admin always can view their own pieces regardless of status/visibility
  if (viewer && (viewer.id === piece.authorId || viewer.role === "admin")) {
    return true;
  }

  // Non-approved pieces are hidden from everyone else
  if (piece.reviewStatus !== "approved") {
    return false;
  }

  // Approved pieces: check visibility
  if (piece.visibility === "public") return true;
  if (piece.visibility === "private") return false; // only author/admin already returned
  if (piece.visibility === "group") {
    // For group visibility, we need to know if viewer is a member of any group that
    // could grant access. Since pieces are not yet tied to a specific group (no groupId
    // FK on pieces), group visibility currently means "any group member can view".
    // Once Phase 7 adds piece<->group linkage, this will filter by specific group.
    return viewerGroupIds.length > 0;
  }
  return false;
}

/**
 * Fetch a piece by id and return it only if `viewer` can view it.
 * Returns null if not found or not visible.
 */
export async function getPieceById(
  pieceId: string,
  viewer: LocalUser | null,
): Promise<PieceWithAuthor | null> {
  const piece = await db.query.pieces.findFirst({
    where: eq(pieces.id, pieceId),
    with: { author: true },
  });
  if (!piece) return null;

  const groupIds = await getViewerGroupIds(viewer);
  if (!canViewPiece(piece, viewer, groupIds)) return null;

  return piece as PieceWithAuthor;
}

/**
 * Fetch a piece by slug and return it only if `viewer` can view it.
 */
export async function getPieceBySlug(
  slug: string,
  viewer: LocalUser | null,
): Promise<PieceWithAuthor | null> {
  const piece = await db.query.pieces.findFirst({
    where: eq(pieces.slug, slug),
    with: { author: true },
  });
  if (!piece) return null;

  const groupIds = await getViewerGroupIds(viewer);
  if (!canViewPiece(piece, viewer, groupIds)) return null;

  return piece as PieceWithAuthor;
}

/**
 * Feed: only approved + public pieces, ordered by publishedAt desc.
 * This is the public discovery feed (Phase 5). No viewer required — anyone can see it.
 * Group/private pieces never appear here.
 */
export async function getPublishedPieces(opts?: {
  limit?: number;
  offset?: number;
}): Promise<PieceWithAuthor[]> {
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;

  const rows = await db.query.pieces.findMany({
    where: and(
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

/**
 * Own pieces: drafts + submitted + approved for the given author.
 * Used for the author's dashboard/edit flow. Viewer must be author or admin.
 */
export async function getOwnPieces(
  authorId: string,
  viewer: LocalUser | null,
): Promise<PieceWithAuthor[]> {
  if (!viewer || (viewer.id !== authorId && viewer.role !== "admin")) {
    return [];
  }

  const rows = await db.query.pieces.findMany({
    where: eq(pieces.authorId, authorId),
    with: { author: true },
    orderBy: [desc(pieces.updatedAt)],
  });

  return rows as PieceWithAuthor[];
}

/**
 * Review queue: submitted + in_review pieces (any visibility).
 * Caller must verify canModerate — this function does NOT check permissions.
 */
export async function getReviewQueuePieces(): Promise<PieceWithAuthor[]> {
  const rows = await db.query.pieces.findMany({
    where: or(
      eq(pieces.reviewStatus, "submitted"),
      eq(pieces.reviewStatus, "in_review"),
    ),
    with: { author: true },
    orderBy: [desc(pieces.updatedAt)],
  });

  return rows as PieceWithAuthor[];
}

/**
 * Helper for Server Actions that need to verify ownership before mutating.
 * Returns the piece if viewer is author or admin, otherwise null.
 */
export async function getPieceForEdit(
  pieceId: string,
  viewer: LocalUser | null,
): Promise<PieceWithAuthor | null> {
  if (!viewer) return null;
  const piece = await db.query.pieces.findFirst({
    where: eq(pieces.id, pieceId),
    with: { author: true },
  });
  if (!piece) return null;
  if (piece.authorId !== viewer.id && viewer.role !== "admin") return null;
  return piece as PieceWithAuthor;
}

/**
 * Visible pieces for a viewer (used for future feed variants that include group content).
 * Approved + (public OR (group AND viewer is member)).
 */
export async function getVisiblePiecesForViewer(
  viewer: LocalUser | null,
  opts?: { limit?: number; offset?: number },
): Promise<PieceWithAuthor[]> {
  const groupIds = await getViewerGroupIds(viewer);
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;

  if (!viewer || groupIds.length === 0) {
    // No group membership — only public approved
    return getPublishedPieces({ limit, offset });
  }

  // Viewer is group member — can see public + group approved
  const rows = await db.query.pieces.findMany({
    where: and(
      eq(pieces.reviewStatus, "approved"),
      or(eq(pieces.visibility, "public"), eq(pieces.visibility, "group")),
    ),
    with: { author: true },
    orderBy: [desc(pieces.publishedAt), desc(pieces.createdAt)],
    limit,
    offset,
  });

  return rows as PieceWithAuthor[];
}
