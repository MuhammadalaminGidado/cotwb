"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { pieces, reviews } from "@/lib/db/schema";
import { canModerate, currentUser } from "@/lib/auth";

const reviewSchema = z.object({
  pieceId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

export async function approvePiece(
  input: z.infer<typeof reviewSchema>,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await currentUser();
  if (!user || !canModerate(user)) {
    return { success: false, error: "Only admins can approve pieces." };
  }

  const piece = await db.query.pieces.findFirst({
    where: eq(pieces.id, parsed.data.pieceId),
  });
  if (!piece) {
    return { success: false, error: "Piece not found." };
  }
  if (piece.reviewStatus !== "submitted" && piece.reviewStatus !== "in_review") {
    return { success: false, error: `Cannot approve from status: ${piece.reviewStatus}` };
  }

  await db.insert(reviews).values({
    pieceId: piece.id,
    reviewerId: user.id,
    status: "approved",
    notes: parsed.data.notes ?? null,
  });

  await db
    .update(pieces)
    .set({
      reviewStatus: "approved",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pieces.id, piece.id));

  revalidatePath("/review-queue");
  revalidatePath("/");
  revalidatePath(`/pieces/${piece.slug}`);
  revalidatePath(`/write/${piece.id}/edit`);

  return { success: true };
}

export async function rejectPiece(
  input: z.infer<typeof reviewSchema>,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await currentUser();
  if (!user || !canModerate(user)) {
    return { success: false, error: "Only admins can reject pieces." };
  }

  const piece = await db.query.pieces.findFirst({
    where: eq(pieces.id, parsed.data.pieceId),
  });
  if (!piece) {
    return { success: false, error: "Piece not found." };
  }
  if (piece.reviewStatus !== "submitted" && piece.reviewStatus !== "in_review") {
    return { success: false, error: `Cannot reject from status: ${piece.reviewStatus}` };
  }

  await db.insert(reviews).values({
    pieceId: piece.id,
    reviewerId: user.id,
    status: "rejected",
    notes: parsed.data.notes ?? null,
  });

  await db
    .update(pieces)
    .set({ reviewStatus: "rejected", updatedAt: new Date() })
    .where(eq(pieces.id, piece.id));

  revalidatePath("/review-queue");
  revalidatePath(`/write/${piece.id}/edit`);

  return { success: true };
}
