import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 5;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
  const agentSlug = searchParams.get("agentSlug");

  const logs = await prisma.agentLog.findMany({
    where: agentSlug
      ? { agent: { slug: agentSlug } }
      : undefined,
    include: { agent: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(
    logs.map((log) => ({
      id: log.id,
      time: log.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      agent: log.agent.name,
      agentSlug: log.agent.slug,
      message: log.message,
      level: log.level,
      createdAt: log.createdAt.toISOString(),
    })),
    {
      headers: {
        "Cache-Control": "private, s-maxage=5, stale-while-revalidate=10",
      },
    }
  );
}
