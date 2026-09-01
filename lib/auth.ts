import { auth as clerkAuth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export type LocalUser = typeof users.$inferSelect;

/**
 * Resolves the Clerk session to the local `users` row.
 * This is the ONLY place that calls Clerk's `auth()` — all Server
 * Components and Server Actions must go through `currentUser()`.
 */
export async function currentUser(): Promise<LocalUser | null> {
  try {
    const { userId: clerkId } = await clerkAuth();
    if (!clerkId) return null;

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    return user ?? null;
  } catch {
    // No valid Clerk keys configured — treat as unauthenticated
    return null;
  }
}

/** Any registered user — for comments/reactions */
export function canInteract(user: LocalUser | null): boolean {
  return !!user;
}

/** Writer or admin — for piece create/edit/submit */
export function canWrite(user: LocalUser | null): boolean {
  return !!user && (user.isWriter || user.role === "admin");
}

/** Admin only — for review queue, moderation, revokeWriter */
export function canModerate(user: LocalUser | null): boolean {
  return user?.role === "admin";
}
