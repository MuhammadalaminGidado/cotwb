import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

function hasValidClerkKeys(): boolean {
  const pub = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const secret = process.env.CLERK_SECRET_KEY ?? "";
  // Real Clerk publishable keys are pk_test_/pk_live_ + ~60+ base64 chars (>80 total)
  // Placeholder/test keys in this repo are shorter and will be treated as "not configured"
  return (
    (pub.startsWith("pk_test_") || pub.startsWith("pk_live_")) &&
    pub.length > 70 &&
    secret.length > 20
  );
}

export default hasValidClerkKeys()
  ? clerkMiddleware()
  : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
