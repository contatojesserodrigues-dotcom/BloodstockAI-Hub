import { NextResponse } from "next/server";
import { listApprovals, createApprovalCard } from "@/lib/db/approvals";
import { verifyWebhookSecret } from "@/lib/webhook-auth";
import { getDbAgentBySlug } from "@/lib/agent-service";
import { prisma } from "@/lib/prisma";

export const revalidate = 10;

export async function GET() {
  const { approvals, source } = await listApprovals(30);
  return NextResponse.json(
    approvals.map((a) => ({
      id: a.id,
      agentSlug: a.agent_name.toLowerCase().replace(/\s+/g, "-"),
      agentName: a.agent_name,
      type: a.action_type,
      title: a.subject || `${a.action_type} — ${a.company}`,
      description: a.full_message,
      preview: a.message_preview,
      riskLevel: a.risk_level,
      status: a.status.toUpperCase(),
      company: a.company,
      country: a.country,
      sourceUrls: a.source_urls,
    })),
    { headers: { "X-Data-Source": source } }
  );
}

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { agentSlug, type, title, description, preview, riskLevel = "low", email, leadId } = body;

  if (!agentSlug || !type || !title) {
    return NextResponse.json({ error: "agentSlug, type and title required" }, { status: 400 });
  }

  const agent = await getDbAgentBySlug(agentSlug);
  const agentName = agent?.name || agentSlug;

  const result = await createApprovalCard({
    agentName,
    agentSlug,
    actionType: type,
    company: title,
    subject: title,
    messagePreview: preview || email?.body,
    fullMessage: description || email?.body,
    riskLevel,
    leadId,
  });

  if (agent) {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { status: "WAITING_APPROVAL", currentTask: `Awaiting approval: ${title}` },
    });
  }

  return NextResponse.json({ ok: true, approval: { id: result.id, status: "pending" } });
}
