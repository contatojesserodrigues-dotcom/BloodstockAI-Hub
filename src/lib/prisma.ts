import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function isPrismaAvailable() {
  const url = process.env.DATABASE_URL || "";
  if (process.env.NODE_ENV === "production" && (!url || url.startsWith("file:"))) {
    return false;
  }
  return Boolean(url);
}

function createClient() {
  if (!isPrismaAvailable()) return null;
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

/** Prisma is optional in production — Supabase is the primary backend. */
export const prisma = createClient() as PrismaClient;
