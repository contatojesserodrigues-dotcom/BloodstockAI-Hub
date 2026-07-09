import { NextResponse } from "next/server";
import { validateAdminCredentials } from "@/lib/auth";
import { COOKIE_NAME, createSessionToken, SESSION_MAX_AGE } from "@/lib/auth-crypto";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  if (!validateAdminCredentials(email, password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSessionToken(email.trim().toLowerCase());
  const response = NextResponse.json({ ok: true, redirect: "/dashboard" });
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
