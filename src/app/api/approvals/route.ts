import { NextResponse } from "next/server";
import { verifyWebhookSecret } from "@/lib/webhook-auth";
import { getDbAgentBySlug } from "@/lib/agent-service";
import { prisma } from "@/lib/prisma";
import type { ApprovalStatus } from "@prisma/client";

export const revalidate = 15;

export async function GET() {
  const approvals = await prisma.approvalRequest.findMany({
    include: { agent: { select: { slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(
    approvals.map((a) => ({
      id: a.id,
      agentSlug: a.agent.slug,
      type: a.type,
      title: a.title,
      description: a.description,
      preview: a.preview,
      riskLevel: a.riskLevel,
      status: a.status,
    })),
    {
      headers: {
        "Cache-Control": "private, s-maxage=15, stale-while-revalidate=30",
      },
    }
  );
}

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    agentSlug,
    type,
    title,
    description,
    preview,
    riskLevel = "low",
    email,
    leadId,
  } = body as {
    agentSlug: string;
    type: string;
    title: string;
    description?: string;
    preview?: string;
    riskLevel?: string;
    leadId?: string;
    email?: { subject: string; body: string; recipient: string };
  };

  if (!agentSlug || !type || !title) {
    return NextResponse.json({ error: "agentSlug, type and title required" }, { status: 400 });
  }

  const agent = await getDbAgentBySlug(agentSlug);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let emailDraftId: string | undefined;
  if (email) {
    const draft = await prisma.emailDraft.create({
      data: {
        agentId: agent.id,
        subject: email.subject,
        body: email.body,
        recipient: email.recipient,
        status: "PENDING",
      },
    });
    emailDraftId = draft.id;
  }

  const approval = await prisma.approvalRequest.create({
    data: {
      agentId: agent.id,
      type,
      title,
      description,
      preview: preview || email?.body,
      riskLevel,
      status: "PENDING" as ApprovalStatus,
      leadId,
      emailDraftId,
    },
    include: { agent: { select: { slug: true, name: true } } },
  });

  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      status: "WAITING_APPROVAL",
      currentTask: `Awaiting approval: ${title}`,
      lastAction: `Created approval request: ${title}`,
    },
  });

  await prisma.agentLog.create({
    data: {
      agentId: agent.id,
      message: `Created approval request: ${title}`,
      level: "approval",
    },
  });

  return NextResponse.json({
    ok: true,
    approval: {
      id: approval.id,
      agentSlug: approval.agent.slug,
      type: approval.type,
      title: approval.title,
      status: approval.status,
    },
  });
}
