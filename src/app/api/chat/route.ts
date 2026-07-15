import { NextResponse } from "next/server";
import { generateAgentResponse, extractN8nResponse } from "@/lib/ai/providers";
import { getLiveAgent } from "@/lib/agent-service";
import { routeCommand } from "@/lib/workflow";
import { prisma } from "@/lib/prisma";
import { triggerAgentCommand } from "@/lib/n8n";

export async function POST(request: Request) {
  const { message, agentSlug } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const routed = routeCommand(message);
  const slug = agentSlug || routed.agents[0];
  const agent = await getLiveAgent(slug);

  const dbAgent = agent
    ? await prisma.agent.findUnique({ where: { slug: agent.slug }, select: { id: true } })
    : null;

  const history = dbAgent
    ? await prisma.conversation.findMany({
        where: { agentId: dbAgent.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { role: true, content: true },
      })
    : [];

  if (dbAgent) {
    await prisma.conversation.create({
      data: { agentId: dbAgent.id, role: "user", content: message },
    });
  }

  let response: string | null = null;
  let source: "n8n" | "ai" | "router" = "router";

  const n8nResult = await triggerAgentCommand(message, agent?.slug || slug);
  if (n8nResult.ok) {
    response = extractN8nResponse(n8nResult.data);
    if (response) source = "n8n";
  }

  if (!response && agent) {
    response = await generateAgentResponse(
      agent,
      message,
      history.reverse().map((h) => ({ role: h.role, content: h.content }))
    );
    if (response) source = "ai";
  }

  if (!response) {
    response = agent && agentSlug
      ? `[${agent.name}] ${routed.response}`
      : routed.response;
  }

  if (dbAgent) {
    await prisma.conversation.create({
      data: { agentId: dbAgent.id, role: "assistant", content: response },
    });

    await prisma.agent.update({
      where: { id: dbAgent.id },
      data: {
        lastAction: `Responded to command: ${message.slice(0, 80)}`,
        currentTask: agent?.currentTask,
      },
    });

    await prisma.agentLog.create({
      data: {
        agentId: dbAgent.id,
        message: `Chat: ${message.slice(0, 120)}`,
        level: "info",
      },
    });
  }

  return NextResponse.json({
    response,
    agentName: agent?.name || "Amelia Scott",
    agents: routed.agents,
    source,
    n8nTriggered: n8nResult.ok,
  });
}
