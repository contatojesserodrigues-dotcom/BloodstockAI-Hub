import { NextResponse } from "next/server";
import { validateCredentials } from "@/lib/auth";
import {
  COOKIE_NAME,
  ONBOARDING_COOKIE,
  createSessionToken,
  SESSION_MAX_AGE,
} from "@/lib/auth-crypto";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const ok = await validateCredentials(email, password);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const normalized = String(email).trim().toLowerCase();
  const token = await createSessionToken(normalized);

  const membership = await prisma.membership.findFirst({
    where: { userEmail: normalized },
  });
  const cookiesHeader = request.headers.get("cookie") || "";
  const onboardedCookie = cookiesHeader.includes(`${ONBOARDING_COOKIE}=1`);
  const redirect = membership || onboardedCookie ? "/dashboard" : "/signup?step=hub";

  const response = NextResponse.json({ ok: true, redirect });
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
