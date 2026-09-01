"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { canModerate, currentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Opt-in to writer status.
 * Irreversible by the user — once true, only an admin can revoke via revokeWriter.
 */
export async function becomeWriter(): Promise<
  { success: true } | { success: false; error: string }
> {
  const user = await currentUser();

  if (!user) {
    return { success: false, error: "You must be signed in to become a writer." };
  }

  if (user.isWriter) {
    return { success: false, error: "You are already a writer." };
  }

  await db
    .update(users)
    .set({ isWriter: true, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  revalidatePath("/settings");
  revalidatePath("/write");

  return { success: true };
}

const revokeSchema = z.object({
  userId: z.string().uuid(),
});

/**
 * Admin-only: revoke writer status from a user.
 */
export async function revokeWriter(
  input: z.infer<typeof revokeSchema>,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = revokeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const actor = await currentUser();
  if (!actor) {
    return { success: false, error: "You must be signed in." };
  }
  if (!canModerate(actor)) {
    return { success: false, error: "Only admins can revoke writer status." };
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, parsed.data.userId),
  });

  if (!target) {
    return { success: false, error: "User not found." };
  }

  if (!target.isWriter) {
    return { success: false, error: "User is not a writer." };
  }

  await db
    .update(users)
    .set({ isWriter: false, updatedAt: new Date() })
    .where(eq(users.id, parsed.data.userId));

  revalidatePath("/settings");
  revalidatePath("/write");

  return { success: true };
}
