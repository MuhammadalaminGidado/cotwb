import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { hasValidClerkKeys } from "@/lib/clerk-config";

const clerkHandler = hasValidClerkKeys() ? clerkMiddleware() : null;

export default function middleware(
  request: Parameters<NonNullable<typeof clerkHandler>>[0],
  event: Parameters<NonNullable<typeof clerkHandler>>[1],
) {
  const pathname = request.nextUrl.pathname;
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);

  const nextWithHeader = () => {
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("x-pathname", pathname);
    return res;
  };

  if (!clerkHandler) return nextWithHeader();

  try {
    const res = clerkHandler(request, event) as NextResponse | Promise<NextResponse> | undefined;
    if (res && typeof (res as Promise<unknown>).then === "function") {
      return (res as Promise<NextResponse>).then((r) => {
        if (r instanceof NextResponse) {
          r.headers.set("x-pathname", pathname);
          return r;
        }
        return nextWithHeader();
      });
    }
    if (res instanceof NextResponse) {
      res.headers.set("x-pathname", pathname);
      return res;
    }
    return nextWithHeader();
  } catch {
    return nextWithHeader();
  }
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
