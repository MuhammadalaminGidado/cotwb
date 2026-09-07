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

    const existing = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    if (existing) return existing;

    // Fallback lazy-create: webhook may not have delivered yet (e.g. ngrok not
    // forwarding locally). Fetch Clerk profile and insert local row so onboarding
    // can show immediately instead of 12s polling.
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(clerkId);
      const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress ?? null;
      const rawUsername = clerkUser.username?.trim() || null;
      const derivedUsername = (() => {
        if (rawUsername && rawUsername.length > 0) return rawUsername;
        if (primaryEmail) {
          const prefix = primaryEmail.split("@")[0]?.trim();
          if (prefix) return prefix.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        }
        return `user_${clerkId.slice(-8)}`;
      })();
      const displayName =
        `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || rawUsername || null;
      const image = clerkUser.imageUrl ?? null;

      let finalUsername = derivedUsername;
      let attempt = 0;
      while (attempt < 3) {
        const clash = await db.query.users.findFirst({ where: eq(users.username, finalUsername) });
        if (!clash) break;
        finalUsername = `${derivedUsername}_${clerkId.slice(-4)}`;
        if (attempt > 0) finalUsername = `${finalUsername}_${attempt}`;
        attempt++;
      }

      await db
        .insert(users)
        .values({
          clerkId,
          username: finalUsername,
          displayName,
          image,
          role: "user",
          isWriter: false,
        })
        .onConflictDoNothing();

      const created = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
      if (created) return created;
    } catch (fallbackErr) {
      // Fallback is best-effort — webhook remains source of truth if this fails
      const fMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      if (!fMsg.includes("DYNAMIC_SERVER_USAGE") && !fMsg.includes("Dynamic server usage")) {
        console.warn("[auth] fallback create failed", fallbackErr);
      }
    }

    return null;
  } catch (err) {
    // No valid Clerk keys configured or DB unreachable — treat as unauthenticated
    // but log for diagnostics (webhook race vs infra failure). Suppress
    // DYNAMIC_SERVER_USAGE which is expected during `next build` static generation.
    const msg = err instanceof Error ? err.message : String(err);
    const digest = (err as { digest?: string })?.digest ?? "";
    if (!msg.includes("DYNAMIC_SERVER_USAGE") && !msg.includes("Dynamic server usage") && !digest.includes("DYNAMIC")) {
      console.error("[auth] currentUser failed", err);
    }
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
