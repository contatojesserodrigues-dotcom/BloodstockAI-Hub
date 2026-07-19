import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, ONBOARDING_COOKIE, verifySessionToken } from "@/lib/auth-crypto";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/legal",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/signup",
  "/api/n8n/webhook",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/kuiper-logo") ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const onboarded = request.cookies.get(ONBOARDING_COOKIE)?.value === "1";
  const isOnboarding =
    pathname === "/onboarding" ||
    pathname === "/signup" ||
    pathname.startsWith("/api/onboarding") ||
    pathname.startsWith("/api/auth/signup");

  if (!onboarded && !isOnboarding && !pathname.startsWith("/api/auth")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Onboarding required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/signup", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
