import { NextResponse } from "next/server";
import { AGENT_ACTIONS, buildActionCommand } from "@/lib/agent-actions";
import { getDbAgentBySlug, logAgentActivity } from "@/lib/agent-service";
import { triggerAgentCommand, triggerConsignorWorkflow } from "@/lib/n8n";
import { prisma } from "@/lib/prisma";
import type { AgentStatus } from "@prisma/client";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const actionDef = AGENT_ACTIONS[slug];

  if (!actionDef) {
    return NextResponse.json({ error: "No action defined for this agent" }, { status: 404 });
  }

  const agent = await getDbAgentBySlug(slug);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const command = (body.command as string) || buildActionCommand(slug, actionDef);

  await prisma.agentTask.create({
    data: {
      agentId: agent.id,
      title: actionDef.label,
      description: actionDef.description,
      status: "running",
    },
  });

  const status = (actionDef.updatesStatus as AgentStatus) || "RESEARCHING";
  await logAgentActivity(slug, `Started: ${actionDef.label} - ${actionDef.description}`, "info", {
    status,
    currentTask: actionDef.updatesTask || actionDef.description,
    lastAction: `Triggered ${actionDef.label}`,
  });

  let n8nResult;
  if (actionDef.n8nType === "consignor-workflow") {
    n8nResult = await triggerConsignorWorkflow();
  } else {
    n8nResult = await triggerAgentCommand(command, slug);
  }

  return NextResponse.json({
    ok: true,
    action: actionDef.id,
    agentSlug: slug,
    command,
    n8n: {
      ok: n8nResult.ok,
      status: n8nResult.status,
      message: n8nResult.ok
        ? `${actionDef.label} triggered on n8n`
        : n8nResult.error || "n8n webhook not reachable - task logged in HUB",
      data: n8nResult.data,
    },
  });
}
