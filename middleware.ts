import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { hasValidClerkKeys } from "@/lib/clerk-config";

const isProtectedRoute = createRouteMatcher([
  "/onboarding(.*)",
  "/write(.*)",
  "/settings(.*)",
  "/review-queue(.*)",
  "/moderation(.*)",
]);

const clerkHandler = hasValidClerkKeys()
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    })
  : null;

export default function middleware(
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
      return (result as Promise<NextResponse>).catch((err) => {
        console.warn("[middleware] clerkMiddleware failed, falling back", err);
        return NextResponse.next();
      });
    }
    return result as NextResponse;
  } catch (err) {
    console.warn("[middleware] clerkMiddleware threw, falling back", err);
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
