import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  createSessionToken,
  SESSION_MAX_AGE,
  verifySessionToken,
} from "@/lib/auth-crypto";

export async function setSession(email: string) {
  const token = await createSessionToken(email);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return token;
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function validateAdminCredentials(email: string, password: string) {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@bloodstockai.com").trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || "BloodstockAI2026!").trim();
  return email.trim().toLowerCase() === adminEmail && password === adminPassword;
}

export { COOKIE_NAME, verifySessionToken, createSessionToken, SESSION_MAX_AGE };
