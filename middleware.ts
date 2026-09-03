import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { hasValidClerkKeys } from "@/lib/clerk-config";

// Auth is checked resource-based in layouts (app/(app)/layout.tsx, app/(admin)/layout.tsx)
// This middleware only forwards x-pathname for layout branching and initializes Clerk.
// Do not use createRouteMatcher here (deprecated, see https://clerk.com/docs/guides/development/upgrading/upgrade-guides/migrate-from-create-route-matcher)
const clerkHandler = hasValidClerkKeys() ? clerkMiddleware() : null;

export default function middleware(
  request: Parameters<NonNullable<typeof clerkHandler>>[0],
  event: Parameters<NonNullable<typeof clerkHandler>>[1],
) {
  const pathnameHeader = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathnameHeader);

  const withHeader = (res: NextResponse) => {
    res.headers.set("x-pathname", pathnameHeader);
    return res;
  };

  if (!clerkHandler) return withHeader(NextResponse.next({ request: { headers: requestHeaders } }));
  try {
    // propagate pathname to Server Components via request header
    const res = clerkHandler(request, event) as NextResponse | Promise<NextResponse> | undefined;
    if (res && typeof (res as Promise<unknown>).catch === "function") {
      return (res as Promise<NextResponse>)
        .then((r) => {
          if (r instanceof NextResponse) return withHeader(r);
          return withHeader(NextResponse.next({ request: { headers: requestHeaders } }));
        })
        .catch((err) => {
          console.warn("[middleware] clerkMiddleware failed, falling back", err);
          return withHeader(NextResponse.next({ request: { headers: requestHeaders } }));
        });
    }
    if (res instanceof NextResponse) return withHeader(res);
    return withHeader(NextResponse.next({ request: { headers: requestHeaders } }));
  } catch (err) {
    console.warn("[middleware] clerkMiddleware threw, falling back", err);
    return withHeader(NextResponse.next({ request: { headers: requestHeaders } }));
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
