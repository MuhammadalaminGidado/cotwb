import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { memberships, writingGroups } from "@/lib/db/schema";
import type { LocalUser } from "@/lib/auth";

/**
 * Fetch group IDs for viewer membership.
 * Shared between pieces.ts and search.ts to keep visibility logic consistent.
 */
export async function getViewerGroupIds(viewer: LocalUser | null): Promise<string[]> {
  if (!viewer) return [];
  const rows = await db
    .select({ groupId: memberships.groupId })
    .from(memberships)
    .where(eq(memberships.userId, viewer.id));
  return rows.map((r) => r.groupId);
}

export async function getViewerGroups(
  viewer: LocalUser | null,
): Promise<{ id: string; name: string; slug: string }[]> {
  if (!viewer) return [];
  const rows = await db
    .select({ id: writingGroups.id, name: writingGroups.name, slug: writingGroups.slug })
    .from(memberships)
    .innerJoin(writingGroups, eq(memberships.groupId, writingGroups.id))
    .where(eq(memberships.userId, viewer.id));
  return rows;
}
