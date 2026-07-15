import { NextResponse } from "next/server";
import { verifyWebhookSecret } from "@/lib/webhook-auth";
import { getDbAgentBySlug } from "@/lib/agent-service";
import { prisma } from "@/lib/prisma";
import type { AgentStatus } from "@prisma/client";

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = await request.json();
  const { status, currentTask, lastAction } = body as {
    status?: AgentStatus;
    currentTask?: string;
    lastAction?: string;
  };

  const agent = await getDbAgentBySlug(slug);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: {
      ...(status ? { status } : {}),
      ...(currentTask !== undefined ? { currentTask } : {}),
      ...(lastAction !== undefined ? { lastAction } : {}),
    },
  });

  return NextResponse.json({ ok: true, agent: updated });
}
