import { NextResponse } from "next/server";
import { verifyWebhookSecret } from "@/lib/webhook-auth";
import { getDbAgentBySlug } from "@/lib/agent-service";
import { prisma } from "@/lib/prisma";
import type { AgentStatus, ApprovalStatus, PipelineStage } from "@prisma/client";

interface WebhookPayload {
  event?: string;
  agent?: string;
  agentSlug?: string;
  message?: string;
  level?: string;
  workflowId?: string;
  status?: AgentStatus;
  currentTask?: string;
  lastAction?: string;
  approval?: {
    type: string;
    title: string;
    description?: string;
    preview?: string;
    riskLevel?: string;
    email?: { subject: string; body: string; recipient: string };
  };
  lead?: {
    name: string;
    email?: string;
    company?: string;
    country?: string;
    segment?: string;
    stage?: PipelineStage;
    value?: number;
    source?: string;
    notes?: string;
  };
  leads?: WebhookPayload["lead"][];
  task?: { title: string; description?: string; status?: string };
}

async function resolveAgent(slug?: string, name?: string) {
  if (slug) return getDbAgentBySlug(slug);
  if (name) {
    const first = name.split(" ")[0];
    return prisma.agent.findFirst({
      where: { OR: [{ name }, { name: { contains: first } }] },
    });
  }
  return null;
}

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as WebhookPayload;
  const event = body.event || inferEvent(body);
  const agentRecord = await resolveAgent(body.agentSlug, body.agent);

  const results: string[] = [];

  if (event === "log" || body.message) {
    if (agentRecord && body.message) {
      await prisma.agentLog.create({
        data: {
          agentId: agentRecord.id,
          message: body.message,
          level: body.level || "info",
        },
      });
      results.push("log_created");
    }
  }

  if (event === "agent_status" && agentRecord) {
    await prisma.agent.update({
      where: { id: agentRecord.id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.currentTask !== undefined ? { currentTask: body.currentTask } : {}),
        ...(body.lastAction !== undefined ? { lastAction: body.lastAction } : {}),
      },
    });
    results.push("agent_updated");
  }

  if (event === "approval" && agentRecord && body.approval) {
    let emailDraftId: string | undefined;
    if (body.approval.email) {
      const draft = await prisma.emailDraft.create({
        data: {
          agentId: agentRecord.id,
          subject: body.approval.email.subject,
          body: body.approval.email.body,
          recipient: body.approval.email.recipient,
          status: "PENDING",
        },
      });
      emailDraftId = draft.id;
    }

    const approval = await prisma.approvalRequest.create({
      data: {
        agentId: agentRecord.id,
        type: body.approval.type,
        title: body.approval.title,
        description: body.approval.description,
        preview: body.approval.preview || body.approval.email?.body,
        riskLevel: body.approval.riskLevel || "low",
        status: "PENDING" as ApprovalStatus,
        emailDraftId,
      },
    });

    await prisma.agent.update({
      where: { id: agentRecord.id },
      data: {
        status: "WAITING_APPROVAL",
        currentTask: `Awaiting approval: ${body.approval.title}`,
        lastAction: `Created approval: ${body.approval.title}`,
      },
    });

    results.push(`approval_created:${approval.id}`);
  }

  if ((event === "lead" || event === "leads") && (body.lead || body.leads)) {
    const leads = body.leads || (body.lead ? [body.lead] : []);
    for (const lead of leads) {
      if (!lead?.name) continue;
      const existing = lead.email
        ? await prisma.lead.findFirst({ where: { email: lead.email } })
        : null;
      if (existing) {
        await prisma.lead.update({
          where: { id: existing.id },
          data: lead,
        });
      } else {
        await prisma.lead.create({ data: lead });
      }
      results.push(`lead_upserted:${lead.name}`);
    }
  }

  if (event === "task" && agentRecord && body.task) {
    await prisma.agentTask.create({
      data: {
        agentId: agentRecord.id,
        title: body.task.title,
        description: body.task.description,
        status: body.task.status || "pending",
      },
    });
    results.push("task_created");
  }

  if (body.message && agentRecord && body.status) {
    await prisma.agent.update({
      where: { id: agentRecord.id },
      data: {
        status: body.status,
        ...(body.currentTask ? { currentTask: body.currentTask } : {}),
        lastAction: body.lastAction || body.message,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    event,
    results,
    received: {
      agent: body.agent,
      agentSlug: body.agentSlug,
      message: body.message,
      workflowId: body.workflowId,
    },
  });
}

function inferEvent(body: WebhookPayload): string {
  if (body.approval) return "approval";
  if (body.leads || body.lead) return "leads";
  if (body.task) return "task";
  if (body.status || body.currentTask || body.lastAction) return "agent_status";
  return "log";
}
