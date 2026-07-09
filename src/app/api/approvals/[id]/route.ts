import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerSendApproved, type SendApprovedPayload } from "@/lib/n8n";

const APPROVAL_ACTIONS: Record<string, { triggersN8n: boolean; logMessage: string }> = {
  "Email Draft": {
    triggersN8n: true,
    logMessage: "Approved email draft - triggering Gmail send via n8n",
  },
  "CRM Update": {
    triggersN8n: true,
    logMessage: "Approved CRM update - syncing HubSpot via n8n",
  },
  "Partnership Message": {
    triggersN8n: true,
    logMessage: "Approved partnership message - sending via n8n",
  },
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { status, approvedBy = "Jesse" } = body;

  if (!status || !["APPROVED", "REJECTED", "EDITED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const approval = await prisma.approvalRequest.findUnique({
    where: { id },
    include: {
      agent: true,
      emailDraft: true,
    },
  });

  if (!approval) {
    return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  }

  if (approval.status !== "PENDING") {
    return NextResponse.json({ error: "Approval already resolved" }, { status: 409 });
  }

  await prisma.approvalRequest.update({
    where: { id },
    data: { status, resolvedAt: new Date() },
  });

  let n8nResult: { ok: boolean; status: number; error?: string } | null = null;

  if (status === "APPROVED") {
    const action = APPROVAL_ACTIONS[approval.type];
    const payload: SendApprovedPayload = {
      approvalId: approval.id,
      type: approval.type,
      title: approval.title,
      description: approval.description,
      preview: approval.preview,
      approved: true,
      approvedBy,
      agentSlug: approval.agent.slug,
      agentName: approval.agent.name,
      riskLevel: approval.riskLevel,
    };

    if (approval.type === "Email Draft" && approval.emailDraft) {
      payload.email = {
        draftId: approval.emailDraft.id,
        subject: approval.emailDraft.subject,
        body: approval.emailDraft.body,
        recipient: approval.emailDraft.recipient,
      };
      await prisma.emailDraft.update({
        where: { id: approval.emailDraft.id },
        data: { status: "APPROVED" },
      });
    }

    if (approval.type === "CRM Update") {
      payload.crm = {
        action: "pipeline_update",
        details: approval.preview || approval.description || approval.title,
      };
    }

    if (action?.triggersN8n) {
      n8nResult = await triggerSendApproved(payload);
    }

    await prisma.agentLog.create({
      data: {
        agentId: approval.agentId,
        message: action?.logMessage || `Action approved by ${approvedBy}: ${approval.title}`,
        level: "success",
      },
    });

    if (approval.type === "Email Draft") {
      await prisma.agentLog.create({
        data: {
          agentId: approval.agentId,
          message: n8nResult?.ok
            ? `Gmail send triggered for ${approval.emailDraft?.recipient || "recipient"}`
            : `Approval saved locally - n8n send pending (configure webhook)`,
          level: n8nResult?.ok ? "success" : "warning",
        },
      });
    }

    if (approval.type === "CRM Update") {
      const oliver = await prisma.agent.findUnique({ where: { slug: "oliver-brooks" } });
      if (oliver) {
        await prisma.agentLog.create({
          data: {
            agentId: oliver.id,
            message: n8nResult?.ok
              ? "HubSpot pipeline update triggered via n8n"
              : "CRM approval saved - n8n sync pending",
            level: n8nResult?.ok ? "success" : "warning",
          },
        });
      }
    }
  }

  if (status === "REJECTED") {
    if (approval.emailDraftId) {
      await prisma.emailDraft.update({
        where: { id: approval.emailDraftId },
        data: { status: "REJECTED" },
      });
    }
    await prisma.agentLog.create({
      data: {
        agentId: approval.agentId,
        message: `Action rejected by ${approvedBy}: ${approval.title}`,
        level: "warning",
      },
    });
  }

  return NextResponse.json({
    ok: true,
    status,
    approvalId: id,
    n8n: n8nResult
      ? {
          triggered: true,
          ok: n8nResult.ok,
          message: n8nResult.ok
            ? "n8n workflow triggered successfully"
            : n8nResult.error || "n8n webhook not reachable - action saved in HUB",
        }
      : { triggered: false },
  });
}
