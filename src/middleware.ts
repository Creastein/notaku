import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Auth state is managed client-side via localStorage.
  // Middleware cannot access localStorage, so we just pass through.
  // Client-side redirects in page.tsx and onboarding/page.tsx handle auth routing.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json|logo.png|icon-.*\\.png|robots.txt|sitemap.xml).*)",
  ],
};
