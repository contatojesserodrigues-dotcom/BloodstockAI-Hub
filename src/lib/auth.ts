import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  createSessionToken,
  SESSION_MAX_AGE,
  verifySessionToken,
} from "@/lib/auth-crypto";
import { prisma } from "@/lib/prisma";

function hashPassword(password: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || "change-me-in-production";
  return createHash("sha256").update(`${secret}:${password}`).digest("hex");
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

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
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@kuiper.ai").trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || "Kuiper2026!").trim();
  return email.trim().toLowerCase() === adminEmail && password === adminPassword;
}

export async function validateCredentials(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  if (validateAdminCredentials(normalized, password)) return true;

  try {
    const user = await prisma.hubUser.findUnique({ where: { email: normalized } });
    if (!user) return false;
    return safeEqual(user.passwordHash, hashPassword(password));
  } catch {
    return false;
  }
}

export async function registerUser(opts: {
  email: string;
  password: string;
  name?: string;
}) {
  const email = opts.email.trim().toLowerCase();
  const existing = await prisma.hubUser.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }
  return prisma.hubUser.create({
    data: {
      email,
      name: opts.name?.trim() || null,
      passwordHash: hashPassword(opts.password),
    },
  });
}

export { COOKIE_NAME, verifySessionToken, createSessionToken, SESSION_MAX_AGE, hashPassword };
