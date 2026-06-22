import { NextRequest, NextResponse } from "next/server";

// Inlined (not imported from lib/auth) so the edge bundle stays free of node:crypto.
const SESSION_COOKIE = "ripplr_session";

/**
 * Coarse edge gate: redirect unauthenticated page requests to /login and
 * 401 unauthenticated API requests. Cryptographic verification + tenant
 * scoping happen server-side in route handlers / server components.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  const isAuthApi = pathname.startsWith("/api/auth");
  const isPublic = pathname === "/login" || isAuthApi;

  if (hasSession || isPublic) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
