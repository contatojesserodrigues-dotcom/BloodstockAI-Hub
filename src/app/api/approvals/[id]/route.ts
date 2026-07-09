import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerSendApproved, type SendApprovedPayload } from "@/lib/n8n";
import { getApprovalById, updateApprovalStatus } from "@/lib/db/approvals";
import { executeApprovedViaN8n } from "@/lib/tools/n8n";
import { writeAgentLog } from "@/lib/db/logs";

const APPROVAL_ACTIONS: Record<string, { triggersN8n: boolean; logMessage: string }> = {
  "Email Draft": { triggersN8n: true, logMessage: "Approved email draft - triggering Gmail send via n8n" },
  outreach_email: { triggersN8n: true, logMessage: "Approved outreach email - triggering Gmail via n8n" },
  "CRM Update": { triggersN8n: true, logMessage: "Approved CRM update - syncing HubSpot via n8n" },
  "Partnership Message": { triggersN8n: true, logMessage: "Approved partnership message - sending via n8n" },
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { status, approvedBy = "Admin" } = body;

  if (!status || !["APPROVED", "REJECTED", "EDITED", "approved", "rejected", "edited"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const normalized = status.toUpperCase() === "APPROVED" || status === "approved"
    ? "approved"
    : status.toUpperCase() === "REJECTED" || status === "rejected"
      ? "rejected"
      : "edited";

  const approval = await getApprovalById(id);
  if (!approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 });

  const currentStatus = String((approval as Record<string, unknown>).status || "");
  if (currentStatus !== "PENDING" && currentStatus !== "pending") {
    return NextResponse.json({ error: "Approval already resolved" }, { status: 409 });
  }

  await updateApprovalStatus(id, normalized as "approved" | "rejected" | "edited");

  let n8nResult: { ok: boolean; skipped?: boolean; warning?: string; error?: string } | null = null;

  if (normalized === "approved") {
    const card = approval as Record<string, unknown>;
    const type = String(card.action_type || card.type || "outreach_email");
    const action = APPROVAL_ACTIONS[type];

    n8nResult = await executeApprovedViaN8n({
      action: type,
      approvalId: id,
      agentSlug: "sophia-bennett",
      agentName: String(card.agent_name || (card.agent as { name?: string } | undefined)?.name || "Sophia Bennett"),
      company: String(card.company || card.title || ""),
      contact: String(card.contact || ""),
      subject: String(card.subject || card.title || ""),
      fullMessage: String(card.full_message || card.description || card.preview || ""),
    });

    await writeAgentLog({
      agentSlug: "sophia-bennett",
      agentName: "Sophia Bennett",
      message: action?.logMessage || `Approved: ${card.title || card.subject}`,
      level: "success",
    });

    // Legacy prisma email draft path
    const prismaApproval = await prisma.approvalRequest.findUnique({
      where: { id },
      include: { agent: true, emailDraft: true },
    });
    if (prismaApproval?.emailDraft) {
      const payload: SendApprovedPayload = {
        approvalId: id,
        type: prismaApproval.type,
        title: prismaApproval.title,
        description: prismaApproval.description,
        preview: prismaApproval.preview,
        approved: true,
        approvedBy,
        agentSlug: prismaApproval.agent.slug,
        agentName: prismaApproval.agent.name,
        riskLevel: prismaApproval.riskLevel,
        email: {
          draftId: prismaApproval.emailDraft.id,
          subject: prismaApproval.emailDraft.subject,
          body: prismaApproval.emailDraft.body,
          recipient: prismaApproval.emailDraft.recipient,
        },
      };
      if (!n8nResult?.ok) await triggerSendApproved(payload);
    }
  }

  if (normalized === "rejected") {
    await writeAgentLog({
      agentSlug: "amelia-scott",
      agentName: "Amelia Scott",
      message: `Approval rejected: ${id}`,
      level: "warning",
    });
  }

  return NextResponse.json({
    ok: true,
    status: normalized,
    approvalId: id,
    n8n: n8nResult
      ? {
          triggered: true,
          ok: n8nResult.ok,
          skipped: n8nResult.skipped,
          message: n8nResult.ok
            ? "Approved action sent to n8n"
            : n8nResult.warning || n8nResult.error || "n8n not configured",
        }
      : { triggered: false },
  });
}
