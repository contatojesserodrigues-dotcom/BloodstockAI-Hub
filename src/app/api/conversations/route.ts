import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentSlug = searchParams.get("agentSlug");
  const limit = Math.min(Number(searchParams.get("limit") || 30), 100);

  const agent = agentSlug
    ? await prisma.agent.findUnique({ where: { slug: agentSlug }, select: { id: true } })
    : null;

  const messages = await prisma.conversation.findMany({
    where: agent ? { agentId: agent.id } : undefined,
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { agent: { select: { name: true, slug: true } } },
  });

  return NextResponse.json(
    messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      agentName: m.agent?.name,
      agentSlug: m.agent?.slug,
      createdAt: m.createdAt.toISOString(),
    }))
  );
}
