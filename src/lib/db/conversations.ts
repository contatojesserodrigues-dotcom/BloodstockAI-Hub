import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { getMockLeads } from "@/lib/mock-data";
import type { ConversationRecord, LeadRecord } from "@/lib/supabase/types";

export async function saveConversation(input: {
  agentSlug?: string;
  role: string;
  content: string;
  command?: string;
}) {
  const admin = createSupabaseAdmin();
  if (admin) {
    const agent = input.agentSlug
      ? await admin.from("agents").select("id").eq("slug", input.agentSlug).single()
      : { data: null };
    await admin.from("conversations").insert({
      agent_id: agent.data?.id || null,
      agent_slug: input.agentSlug,
      role: input.role,
      content: input.content,
      command: input.command,
    });
  }

  if (input.agentSlug) {
    const prismaAgent = await prisma.agent.findUnique({ where: { slug: input.agentSlug } });
    if (prismaAgent) {
      await prisma.conversation.create({
        data: {
          agentId: prismaAgent.id,
          role: input.role,
          content: input.content,
        },
      });
    }
  }
}

export async function listConversations(agentSlug: string, limit = 20): Promise<ConversationRecord[]> {
  const admin = createSupabaseAdmin();
  if (admin) {
    const { data } = await admin
      .from("conversations")
      .select("*")
      .eq("agent_slug", agentSlug)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) return data as unknown as ConversationRecord[];
  }

  const agent = await prisma.agent.findUnique({ where: { slug: agentSlug } });
  if (!agent) return [];
  const rows = await prisma.conversation.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    agent_slug: agentSlug,
    role: r.role,
    content: r.content,
    created_at: r.createdAt.toISOString(),
  }));
}

export async function listLeads(limit = 50): Promise<{ leads: LeadRecord[]; source: "supabase" | "mock" }> {
  try {
    const admin = createSupabaseAdmin();
    if (admin) {
      const { data, error } = await admin
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && Array.isArray(data) && data.length) return { source: "supabase", leads: data as unknown as LeadRecord[] };
    }
  } catch {
    // fall through
  }

  try {
    const rows = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: limit });
    if (rows.length) {
      return {
        source: "mock",
        leads: rows.map((l) => ({
          id: l.id,
          company_name: l.company || l.name,
          contact_name: l.name,
          email: l.email,
          phone: null,
          website: null,
          country: l.country,
          segment: l.segment,
          stage: l.stage.toLowerCase() as LeadRecord["stage"],
          value: l.value,
          source: l.source,
          notes: l.notes,
          created_at: l.createdAt.toISOString(),
        })),
      };
    }
  } catch {
    // fall through
  }

  return { source: "mock", leads: getMockLeads().slice(0, limit) };
}

export async function saveLeadBundle(input: {
  companyName: string;
  website?: string | null;
  country?: string | null;
  segment?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  description?: string | null;
  sourceUrls?: string[];
  confidenceScore?: number;
  auctionRelevance?: string | null;
}) {
  const admin = createSupabaseAdmin();

  if (admin) {
    const { data: company } = await admin
      .from("companies")
      .insert({
        name: input.companyName,
        website: input.website,
        country: input.country,
        segment: input.segment,
        description: input.description,
        source_urls: input.sourceUrls || [],
        confidence_score: input.confidenceScore || 0,
      })
      .select()
      .single();

    const { data: contact } = await admin
      .from("contacts")
      .insert({
        company_id: company?.id,
        name: input.contactName || input.companyName,
        email: input.email,
        phone: input.phone,
      })
      .select()
      .single();

    const { data: lead } = await admin
      .from("leads")
      .insert({
        company_id: company?.id,
        contact_id: contact?.id,
        company_name: input.companyName,
        contact_name: input.contactName,
        email: input.email,
        phone: input.phone,
        website: input.website,
        country: input.country,
        segment: input.segment,
        stage: "researched",
        source: "tavily",
        notes: input.description,
        source_urls: input.sourceUrls || [],
        auction_relevance: input.auctionRelevance,
        confidence_score: input.confidenceScore || 0,
      })
      .select()
      .single();

    if (lead) {
      await admin.from("sales_pipeline").insert({
        title: input.companyName,
        value: 25000,
        stage: "researched",
        lead_id: lead.id,
        owner: "James Carter",
      });
      return { leadId: lead.id as string, source: "supabase" as const };
    }
  }

  const company = await prisma.company.create({
    data: {
      name: input.companyName,
      country: input.country || undefined,
      website: input.website || undefined,
      segment: input.segment || undefined,
      notes: input.description || undefined,
    },
  });
  const lead = await prisma.lead.create({
    data: {
      name: input.contactName || input.companyName,
      email: input.email || undefined,
      company: input.companyName,
      country: input.country || undefined,
      segment: input.segment || undefined,
      stage: "RESEARCHED",
      source: "tavily",
      notes: input.description || undefined,
      companyId: company.id,
    },
  });
  return { leadId: lead.id, source: "mock" as const };
}
