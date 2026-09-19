"use server";

import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { memberships, pieceVersions, pieces } from "@/lib/db/schema";
import { canWrite, currentUser } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "untitled";
}

async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let suffix = 0;
  while (true) {
    const existing = await db.query.pieces.findFirst({
      where: eq(pieces.slug, slug),
    });
    if (!existing || (excludeId && existing.id === excludeId)) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

const createDraftSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(256),
    body: z.string().min(1, "Body is required"),
    visibility: z.enum(["public", "group", "private"]).default("public"),
    groupId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.visibility === "group" && !data.groupId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Group is required for group visibility", path: ["groupId"] });
    }
    if (data.visibility !== "group" && data.groupId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Group must be empty unless visibility is group", path: ["groupId"] });
    }
  });

const updatePieceSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(256).optional(),
    body: z.string().min(1).optional(),
    visibility: z.enum(["public", "group", "private"]).optional(),
    groupId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.visibility === "group" && !data.groupId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Group is required for group visibility", path: ["groupId"] });
    }
    if (data.visibility && data.visibility !== "group" && data.groupId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Group must be empty unless visibility is group", path: ["groupId"] });
    }
  });

const idSchema = z.object({
  id: z.string().uuid(),
});

export async function createDraft(
  input: z.infer<typeof createDraftSchema>,
): Promise<
  | { success: true; pieceId: string; slug: string }
  | { success: false; error: string }
> {
  const parsed = createDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await currentUser();
  if (!user || !canWrite(user)) {
    return { success: false, error: "You must be a writer to create drafts." };
  }

  const { title, body, visibility, groupId } = parsed.data;
  if (visibility === "group") {
    const membership = await db.query.memberships.findFirst({
      where: and(eq(memberships.userId, user.id), eq(memberships.groupId, groupId!)),
    });
    if (!membership && user.role !== "admin") {
      return { success: false, error: "You must be a member of the selected group." };
    }
  }
  const baseSlug = slugify(title);
  const slug = await ensureUniqueSlug(baseSlug);

  const [piece] = await db
    .insert(pieces)
    .values({
      title,
      slug,
      body,
      authorId: user.id,
      visibility,
      groupId: visibility === "group" ? groupId ?? null : null,
      reviewStatus: "draft",
    })
    .returning();

  revalidatePath("/write");
  revalidatePath("/");

  // Async Algolia sync — best practice: fire-and-forget via Inngest, never block the mutation.
  try {
    await inngest.send({ name: "piece/sync", data: { pieceId: piece.id, action: "upsert" } });
  } catch (e) {
    console.error("[algolia] piece/sync send failed", e);
  }

  return { success: true, pieceId: piece.id, slug: piece.slug };
}

export async function updatePiece(
  input: z.infer<typeof updatePieceSchema>,
): Promise<
  | { success: true; slug: string }
  | { success: false; error: string }
> {
  const parsed = updatePieceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await currentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to edit pieces." };
  }
  if (!canWrite(user)) {
    return { success: false, error: "You must be a writer to edit pieces." };
  }

  const { id, title, body, visibility, groupId: inputGroupId } = parsed.data;

  const existing = await db.query.pieces.findFirst({
    where: eq(pieces.id, id),
  });
  if (!existing) {
    return { success: false, error: "Piece not found." };
  }
  if (existing.authorId !== user.id && user.role !== "admin") {
    return { success: false, error: "You can only edit your own pieces." };
  }
  if (existing.reviewStatus === "approved") {
    return { success: false, error: "Approved pieces cannot be edited. Create a new version." };
  }

  // Resolve final visibility/groupId for validation (covers partial updates)
  const finalVisibility = visibility ?? existing.visibility;
  const finalGroupId = inputGroupId !== undefined ? inputGroupId : existing.groupId;
  if (finalVisibility === "group" && !finalGroupId) {
    return { success: false, error: "Group is required for group visibility" };
  }
  if (finalVisibility !== "group" && finalGroupId) {
    return { success: false, error: "Group must be empty unless visibility is group" };
  }
  if (finalVisibility === "group" && finalGroupId) {
    const membership = await db.query.memberships.findFirst({
      where: and(eq(memberships.userId, user.id), eq(memberships.groupId, finalGroupId)),
    });
    if (!membership && user.role !== "admin") {
      return { success: false, error: "You must be a member of the selected group." };
    }
  }

  // Write version row before mutating
  const nextVersion = await db
    .select({ maxVersion: max(pieceVersions.version) })
    .from(pieceVersions)
    .where(eq(pieceVersions.pieceId, id))
    .then((rows) => (rows[0]?.maxVersion ?? 0) + 1);

  await db.insert(pieceVersions).values({
    pieceId: id,
    version: nextVersion,
    body: existing.body,
    authorId: user.id,
  });

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) {
    patch.title = title;
    const baseSlug = slugify(title);
    patch.slug = await ensureUniqueSlug(baseSlug, id);
  }
  if (body !== undefined) patch.body = body;
  if (visibility !== undefined) {
    patch.visibility = visibility;
    if (visibility === "group") {
      patch.groupId = finalGroupId;
    } else {
      patch.groupId = null;
    }
  } else if (inputGroupId !== undefined) {
    patch.groupId = finalGroupId;
  }

  const [updated] = await db
    .update(pieces)
    .set(patch as Partial<typeof pieces.$inferInsert>)
    .where(eq(pieces.id, id))
    .returning();

  revalidatePath("/write");
  revalidatePath(`/write/${id}/edit`);
  revalidatePath("/");

  try {
    await inngest.send({ name: "piece/sync", data: { pieceId: id, action: "upsert" } });
  } catch (e) {
    console.error("[algolia] piece/sync send failed", e);
  }

  return { success: true, slug: updated.slug };
}

export async function submitForReview(
  input: z.infer<typeof idSchema>,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid piece id." };
  }

  const user = await currentUser();
  if (!user || !canWrite(user)) {
    return { success: false, error: "You must be a writer to submit for review." };
  }

  const existing = await db.query.pieces.findFirst({
    where: eq(pieces.id, parsed.data.id),
  });
  if (!existing) {
    return { success: false, error: "Piece not found." };
  }
  if (existing.authorId !== user.id && user.role !== "admin") {
    return { success: false, error: "You can only submit your own pieces." };
  }
  if (existing.reviewStatus !== "draft" && existing.reviewStatus !== "rejected") {
    return { success: false, error: `Cannot submit from status: ${existing.reviewStatus}` };
  }

  await db
    .update(pieces)
    .set({ reviewStatus: "submitted", updatedAt: new Date() })
    .where(eq(pieces.id, parsed.data.id));

  revalidatePath("/write");
  revalidatePath("/review-queue");
  revalidatePath(`/write/${parsed.data.id}/edit`);

  try {
    await inngest.send({ name: "piece/sync", data: { pieceId: parsed.data.id, action: "upsert" } });
  } catch (e) {
    console.error("[algolia] piece/sync send failed", e);
  }

  return { success: true };
}

export async function deletePiece(
  input: z.infer<typeof idSchema>,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid piece id." };
  }

  const user = await currentUser();
  if (!user || !canWrite(user)) {
    return { success: false, error: "You must be a writer to delete pieces." };
  }

  const existing = await db.query.pieces.findFirst({
    where: eq(pieces.id, parsed.data.id),
  });
  if (!existing) {
    return { success: false, error: "Piece not found." };
  }
  if (existing.authorId !== user.id && user.role !== "admin") {
    return { success: false, error: "You can only delete your own pieces." };
  }
  if (existing.reviewStatus === "approved") {
    return { success: false, error: "Approved pieces cannot be deleted." };
  }

  await db.delete(pieces).where(eq(pieces.id, parsed.data.id));

  revalidatePath("/write");
  revalidatePath("/");

  try {
    await inngest.send({ name: "piece/sync", data: { pieceId: parsed.data.id, action: "delete" } });
  } catch (e) {
    console.error("[algolia] piece/sync delete send failed", e);
  }

  return { success: true };
}
