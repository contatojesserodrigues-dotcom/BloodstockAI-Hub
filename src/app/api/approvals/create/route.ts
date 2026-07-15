import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createApprovalCard } from "@/lib/db/approvals";
import { updateAgentStatus } from "@/lib/db/agent-actions";
import { writeAgentLog } from "@/lib/db/logs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    agentSlug = "sophia-bennett",
    agentName = "Sophia Bennett",
    actionType = "outreach_email",
    company,
    contact,
    country,
    subject,
    messagePreview,
    fullMessage,
    sourceUrls = [],
    expectedValue = 25000,
    riskLevel = "medium",
    leadId,
    email,
  } = body as {
    agentSlug?: string;
    agentName?: string;
    actionType?: string;
    company?: string;
    contact?: string;
    country?: string;
    subject?: string;
    messagePreview?: string;
    fullMessage?: string;
    sourceUrls?: string[];
    expectedValue?: number;
    riskLevel?: string;
    leadId?: string;
    email?: { subject: string; body: string; recipient: string };
  };

  if (!company || !subject) {
    return NextResponse.json({ error: "company and subject are required" }, { status: 400 });
  }

  const result = await createApprovalCard({
    agentName,
    agentSlug,
    actionType,
    company,
    contact: contact || email?.recipient || company,
    country,
    subject: email?.subject || subject,
    messagePreview: messagePreview || fullMessage?.slice(0, 200),
    fullMessage: email?.body || fullMessage,
    sourceUrls,
    expectedValue,
    riskLevel,
    leadId,
  });

  if (!result.id) {
    return NextResponse.json({ error: "Failed to create approval card" }, { status: 500 });
  }

  await updateAgentStatus(agentSlug, {
    status: "waiting_approval",
    current_task: `Awaiting approval: ${company}`,
    last_action: `Created approval card for ${company}`,
  });

  await writeAgentLog({
    agentSlug,
    agentName,
    message: `Approval card created — ${company}`,
    level: "approval",
  });

  return NextResponse.json({
    ok: true,
    approval: {
      id: result.id,
      agentSlug,
      agentName,
      type: actionType,
      title: subject,
      status: "pending",
      company,
      contact,
      country,
      subject,
      messagePreview,
      sourceUrls,
      expectedValue,
      riskLevel,
      source: result.source,
    },
  });
}
