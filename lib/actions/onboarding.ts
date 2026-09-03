"use server";

import { currentUser } from "@/lib/auth";

export async function checkOnboardingReady(): Promise<
  { ready: true } | { ready: false }
> {
  const user = await currentUser();
  return user ? { ready: true } : { ready: false };
}
