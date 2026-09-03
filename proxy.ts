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

export default function proxy(
  request: Parameters<NonNullable<typeof clerkHandler>>[0],
  event: Parameters<NonNullable<typeof clerkHandler>>[1],
) {
  const pathnameHeader = request.nextUrl.pathname + request.nextUrl.search;
  // Propagate to Server Components via request header (headers() in RSC)
  try {
    request.headers.set("x-pathname", pathnameHeader);
  } catch {
    // ignore if headers immutable
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathnameHeader);

  if (!clerkHandler) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("x-pathname", pathnameHeader);
    return res;
  }
  try {
    const result = clerkHandler(request, event) as NextResponse | Promise<NextResponse>;
    if (result && typeof (result as Promise<unknown>).catch === "function") {
      return (result as Promise<NextResponse>)
        .then((r) => {
          if (r instanceof NextResponse) r.headers.set("x-pathname", pathnameHeader);
          return r;
        })
        .catch(() => {
          const fallback = NextResponse.next({ request: { headers: requestHeaders } });
          fallback.headers.set("x-pathname", pathnameHeader);
          return fallback;
        });
    }
    if (result instanceof NextResponse) {
      result.headers.set("x-pathname", pathnameHeader);
    }
    return result as NextResponse;
  } catch {
    const fallback = NextResponse.next({ request: { headers: requestHeaders } });
    fallback.headers.set("x-pathname", pathnameHeader);
    return fallback;
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
