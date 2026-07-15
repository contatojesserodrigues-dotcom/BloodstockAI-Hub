import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { getMockApprovalCards } from "@/lib/mock-data";
import type { ApprovalCardRecord, ApprovalStatus } from "@/lib/supabase/types";

export async function listApprovals(limit = 30): Promise<{
  approvals: ApprovalCardRecord[];
  source: "supabase" | "mock";
}> {
  try {
    const admin = createSupabaseAdmin();
    if (admin) {
      const { data, error } = await admin
        .from("approval_cards")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data) && data.length) {
        return {
          source: "supabase",
          approvals: (data as Record<string, unknown>[]).map((a) => ({
            ...a,
            source_urls: Array.isArray(a.source_urls) ? a.source_urls : [],
          })) as ApprovalCardRecord[],
        };
      }
    }
  } catch {
    // fall through
  }

  try {
    const rows = await prisma.approvalRequest.findMany({
      include: { agent: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    if (rows.length) {
      return {
        source: "mock",
        approvals: rows.map((a) => ({
          id: a.id,
          agent_name: a.agent.name,
          action_type: a.type,
          company: a.title,
          contact: null,
          country: null,
          subject: a.title,
          message_preview: a.preview,
          full_message: a.description,
          source_urls: [],
          expected_value: 0,
          risk_level: a.riskLevel,
          status: a.status.toLowerCase() as ApprovalStatus,
          created_at: a.createdAt.toISOString(),
        })),
      };
    }
  } catch {
    // fall through
  }

  return { source: "mock", approvals: getMockApprovalCards().slice(0, limit) };
}

export async function createApprovalCard(input: {
  agentName: string;
  agentSlug?: string;
  actionType?: string;
  company: string;
  contact?: string;
  country?: string;
  subject: string;
  messagePreview?: string;
  fullMessage?: string;
  sourceUrls?: string[];
  expectedValue?: number;
  riskLevel?: string;
  leadId?: string;
  metadata?: Record<string, unknown>;
}) {
  const row = {
    agent_name: input.agentName,
    action_type: input.actionType || "outreach_email",
    company: input.company,
    contact: input.contact || input.company,
    country: input.country,
    subject: input.subject,
    message_preview: input.messagePreview,
    full_message: input.fullMessage,
    source_urls: input.sourceUrls || [],
    expected_value: input.expectedValue || 25000,
    risk_level: input.riskLevel || "medium",
    status: "pending",
    lead_id: input.leadId || null,
    metadata: input.metadata || {},
  };

  try {
    const admin = createSupabaseAdmin();
    if (admin) {
      const { data, error } = await admin.from("approval_cards").insert(row).select().single();
      if (!error && data) return { id: data.id as string, source: "supabase" as const };
    }
  } catch {
    // fall through
  }

  try {
    const agent = await prisma.agent.findFirst({
      where: input.agentSlug ? { slug: input.agentSlug } : { name: input.agentName },
    });
    if (agent) {
      const approval = await prisma.approvalRequest.create({
        data: {
          agentId: agent.id,
          type: input.actionType || "outreach_email",
          title: input.subject,
          description: input.fullMessage,
          preview: input.messagePreview,
          riskLevel: input.riskLevel || "medium",
          status: "PENDING",
          leadId: input.leadId,
        },
      });
      return { id: approval.id, source: "mock" as const };
    }
  } catch {
    // fall through
  }

  return { id: `mock-approval-${Date.now()}`, source: "mock" as const };
}

export async function updateApprovalStatus(id: string, status: ApprovalStatus) {
  try {
    const admin = createSupabaseAdmin();
    if (admin) {
      await admin
        .from("approval_cards")
        .update({ status, resolved_at: new Date().toISOString() })
        .eq("id", id);
    }
  } catch {
    // continue
  }

  try {
    const prismaStatus = status.toUpperCase() as "PENDING" | "APPROVED" | "REJECTED" | "EDITED";
    await prisma.approvalRequest.update({
      where: { id },
      data: { status: prismaStatus, resolvedAt: new Date() },
    });
  } catch {
    // id may only exist in supabase or mock
  }
}

export async function getApprovalById(id: string) {
  try {
    const admin = createSupabaseAdmin();
    if (admin) {
      const { data } = await admin.from("approval_cards").select("*").eq("id", id).single();
      if (data) return data;
    }
  } catch {
    // fall through
  }

  try {
    return await prisma.approvalRequest.findUnique({
      where: { id },
      include: { agent: { select: { slug: true, name: true } } },
    });
  } catch {
    return getMockApprovalCards().find((a) => a.id === id) || null;
  }
}
