"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { currentUser } from "@/lib/auth";

export async function checkOnboardingReady(): Promise<
  { ready: true } | { ready: false }
> {
  const user = await currentUser();
  return user ? { ready: true } : { ready: false };
}

const completeOnboardingSchema = z.object({
  isWriter: z.boolean(),
  digestEnabled: z.boolean(),
  digestFrequency: z.enum(["weekly", "never"]),
});

const updateMailingSchema = z.object({
  digestEnabled: z.boolean(),
  digestFrequency: z.enum(["weekly", "never"]),
});

function normalizeDigest(input: {
  digestEnabled: boolean;
  digestFrequency: "weekly" | "never";
}): { digestEnabled: boolean; digestFrequency: "weekly" | "never" } {
  if (!input.digestEnabled) return { digestEnabled: false, digestFrequency: "never" };
  if (input.digestFrequency === "never") return { digestEnabled: false, digestFrequency: "never" };
  return { digestEnabled: true, digestFrequency: "weekly" };
}

export async function completeOnboarding(
  input: z.infer<typeof completeOnboardingSchema>,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = completeOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await currentUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { isWriter: wantWriter, digestEnabled, digestFrequency } = parsed.data;
  const normalized = normalizeDigest({ digestEnabled, digestFrequency });

  // Writer is irreversible via this path — never downgrade an existing writer
  const nextIsWriter = user.isWriter ? true : wantWriter;

  await db
    .update(users)
    .set({
      isWriter: nextIsWriter,
      digestEnabled: normalized.digestEnabled,
      digestFrequency: normalized.digestFrequency,
      onboardingCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/onboarding");
  revalidatePath("/settings");
  revalidatePath("/write");
  revalidatePath("/");

  return { success: true };
}

export async function updateMailingPreferences(
  input: z.infer<typeof updateMailingSchema>,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = updateMailingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await currentUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const normalized = normalizeDigest(parsed.data);

  await db
    .update(users)
    .set({
      digestEnabled: normalized.digestEnabled,
      digestFrequency: normalized.digestFrequency,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/settings");
  revalidatePath("/onboarding");

  return { success: true };
}
