import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { hasValidClerkKeys } from "@/lib/clerk-config";

const clerkHandler = hasValidClerkKeys() ? clerkMiddleware() : null;

export default function proxy(
  request: Parameters<NonNullable<typeof clerkHandler>>[0],
  event: Parameters<NonNullable<typeof clerkHandler>>[1],
) {
  if (!clerkHandler) return NextResponse.next();
  try {
    const result = clerkHandler(request, event);
    // clerkMiddleware returns a promise — catch async validation failures
    // (e.g. placeholder key like healthy-ram-4866 that passes our prefix
    // check but fails Clerk's parsePublishableKey) and fall back to next().
    if (result && typeof (result as Promise<unknown>).catch === "function") {
      return (result as Promise<NextResponse>).catch(() => NextResponse.next());
    }
    return result as NextResponse;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
