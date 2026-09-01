import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

type ClerkWebhookEvent = {
  type: "user.created" | "user.updated" | "user.deleted" | string;
  data: {
    id: string;
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
    email_addresses?: Array<{ email_address: string }>;
  };
};

function deriveUsername(data: ClerkWebhookEvent["data"]): string {
  if (data.username && data.username.trim().length > 0) {
    return data.username.trim();
  }
  const email = data.email_addresses?.[0]?.email_address;
  if (email) {
    const prefix = email.split("@")[0]?.trim();
    if (prefix) return prefix.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  }
  // Fallback: clerkId suffix ensures uniqueness and notNull
  return `user_${data.id.slice(-8)}`;
}

function deriveDisplayName(data: ClerkWebhookEvent["data"]): string | null {
  const first = data.first_name?.trim() ?? "";
  const last = data.last_name?.trim() ?? "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  if (data.username) return data.username;
  return null;
}

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[webhook/clerk] CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 },
    );
  }

  const payload = await req.text();
  let evt: ClerkWebhookEvent;

  try {
    const wh = new Webhook(webhookSecret);
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as unknown as ClerkWebhookEvent;
  } catch (err) {
    console.error("[webhook/clerk] Signature verification failed", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  const eventType = evt.type;
  const data = evt.data;

  try {
    if (eventType === "user.created") {
      const username = deriveUsername(data);
      const displayName = deriveDisplayName(data);
      const image = data.image_url ?? null;

      // Ensure username uniqueness — if collision, append suffix
      let finalUsername = username;
      let attempt = 0;
      while (attempt < 3) {
        const existing = await db.query.users.findFirst({
          where: eq(users.username, finalUsername),
        });
        if (!existing) break;
        finalUsername = `${username}_${data.id.slice(-4)}`;
        if (attempt > 0) finalUsername = `${finalUsername}_${attempt}`;
        attempt++;
      }

      await db
        .insert(users)
        .values({
          clerkId: data.id,
          username: finalUsername,
          displayName,
          image,
          role: "user",
          isWriter: false,
        })
        .onConflictDoNothing();

      // Fallback: if insert was no-op due to clerkId conflict, treat as update
      const inserted = await db.query.users.findFirst({
        where: eq(users.clerkId, data.id),
      });
      if (!inserted) {
        console.error("[webhook/clerk] Failed to insert user", data.id);
        return NextResponse.json(
          { error: "Failed to create user" },
          { status: 500 },
        );
      }
    } else if (eventType === "user.updated") {
      const username = deriveUsername(data);
      const displayName = deriveDisplayName(data);
      const image = data.image_url ?? null;

      const existing = await db.query.users.findFirst({
        where: eq(users.clerkId, data.id),
      });

      if (!existing) {
        // Upsert: if row doesn't exist (e.g. webhook missed create), insert
        await db
          .insert(users)
          .values({
            clerkId: data.id,
            username,
            displayName,
            image,
            role: "user",
            isWriter: false,
          })
          .onConflictDoNothing();
      } else {
        await db
          .update(users)
          .set({
            // Only update username if it's not already taken by another user
            ...(existing.username !== username
              ? await (async () => {
                  const clash = await db.query.users.findFirst({
                    where: eq(users.username, username),
                  });
                  if (clash && clash.clerkId !== data.id) return {};
                  return { username };
                })()
              : {}),
            displayName,
            image,
            updatedAt: new Date(),
          })
          .where(eq(users.clerkId, data.id));
      }
    } else if (eventType === "user.deleted") {
      // Hard delete — cascades to pieces/comments/etc. via FK onDelete cascade.
      // Tradeoff: hard delete removes all user content. Soft-delete would preserve
      // content but leave orphan FK intent. Current choice is hard delete for
      // simplicity; switch to soft-delete (e.g. set deletedAt) if content
      // preservation is required.
      await db.delete(users).where(eq(users.clerkId, data.id));
    } else {
      // Ignore other event types (e.g. session.created) — return 200 so Clerk stops retrying
      return NextResponse.json({ received: true, ignored: eventType });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/clerk] Handler error for", eventType, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Clerk requires POST only; GET returns 405 for clarity
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
