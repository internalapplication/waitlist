import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

// Attaches Clerk auth state to requests. Route-level protection is done inside each API
// route with requireClerkUserId().
const clerk = clerkMiddleware();

// These routes never use Clerk sessions, so they skip it: the health check must keep
// working even if Clerk is slow, and the Dodo webhook is protected by its signature.
const SKIP_CLERK = ["/api/health", "/api/webhooks/"];

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  if (SKIP_CLERK.some((path) => pathname === path || pathname.startsWith(path))) {
    return NextResponse.next();
  }
  return clerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
