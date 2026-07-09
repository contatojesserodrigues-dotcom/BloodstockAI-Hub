import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getApprovalById, updateApprovalStatus } from "@/lib/db/approvals";
import { executeApprovedViaN8n } from "@/lib/tools/n8n";
import { writeAgentLog } from "@/lib/db/logs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { approvalId } = body as { approvalId?: string };
  if (!approvalId) return NextResponse.json({ error: "approvalId required" }, { status: 400 });

  const approval = await getApprovalById(approvalId);
  if (!approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 });

  const card = approval as Record<string, unknown>;
  const status = String(card.status || "");
  if (status !== "approved" && status !== "APPROVED") {
    return NextResponse.json(
      { error: "Approval must be approved before execution" },
      { status: 400 }
    );
  }

  const result = await executeApprovedViaN8n({
    action: String(card.action_type || card.type || "outreach_email"),
    approvalId,
    agentSlug: "sophia-bennett",
    agentName: String(card.agent_name || "Sophia Bennett"),
    company: String(card.company || card.title || ""),
    contact: String(card.contact || ""),
    subject: String(card.subject || card.title || ""),
    fullMessage: String(card.full_message || card.description || ""),
    metadata: card.metadata as Record<string, unknown>,
  });

  if (result.skipped) {
    return NextResponse.json({ ok: false, skipped: true, warning: result.warning });
  }

  await writeAgentLog({
    agentSlug: "amelia-scott",
    agentName: "Amelia Scott",
    message: `Executed approved action via n8n — ${approvalId}`,
    level: "success",
  });

  return NextResponse.json(result);
}
