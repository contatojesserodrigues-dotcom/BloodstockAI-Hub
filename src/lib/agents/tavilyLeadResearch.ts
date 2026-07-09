import { randomUUID } from "crypto";
import { logAgentActivity, updateAgentState } from "@/lib/agent-service";
import { syncLeadToHubSpot } from "@/lib/hubspot/client";
import { prisma } from "@/lib/prisma";
import { getSupabaseConfig, insertSupabaseRows, upsertSupabaseRow } from "@/lib/supabase/server";
import {
  enrichCompanyLead,
  findLeadCompanies,
  getTavilyConfig,
  type EnrichedCompanyLead,
  type ParsedCompanyLead,
} from "@/lib/tavily/client";

export interface TavilyPipelineInput {
  country?: string;
  segment?: string;
  auctionFocus?: string;
  limit?: number;
}

export interface TavilyPipelineLog {
  agent: string;
  agentSlug: string;
  message: string;
  level?: string;
  time: string;
}

export interface TavilyPipelineResult {
  ok: boolean;
  mode: "live" | "mock";
  warnings: string[];
  logs: TavilyPipelineLog[];
  companies: EnrichedCompanyLead[];
  approvalIds: string[];
  hubspotSynced: number;
  summary: string;
}

function nowTime() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function pushLog(logs: TavilyPipelineLog[], agentSlug: string, agent: string, message: string, level = "info") {
  logs.push({ agent, agentSlug, message, level, time: nowTime() });
}

async function logStep(slug: string, message: string, level = "info") {
  await logAgentActivity(slug, message, level);
}

function mockCompanies(limit: number, country: string, segment: string): ParsedCompanyLead[] {
  const samples = [
    { companyName: "Tattersalls Bloodstock", website: "https://tattersalls.com", country: "UK", segment },
    { companyName: "Goffs Bloodstock", website: "https://goffs.com", country: "Ireland", segment },
    { companyName: "Kildangan Stud", website: "https://kildanganstud.com", country: "Ireland", segment },
    { companyName: "Juddmonte Farms", website: "https://juddmonte.com", country: "UK", segment },
    { companyName: "Coolmore Ireland", website: "https://coolmore.com", country: "Ireland", segment },
    { companyName: "Cheveley Park Stud", website: "https://cheveleyparkstud.com", country: "UK", segment },
    { companyName: "Lanwades Stud", website: "https://lanwadesstud.com", country: "UK", segment },
    { companyName: "Barronstown Stud", website: "https://barronstownstud.com", country: "Ireland", segment },
    { companyName: "Newsells Park Stud", website: "https://newsellspark.com", country: "UK", segment },
    { companyName: "Castlehyde Stud", website: "https://castlehyde.com", country: "Ireland", segment },
  ];

  return samples.slice(0, limit).map((s) => ({
    ...s,
    city: null,
    description: `Mock bloodstock lead for ${country} — configure TAVILY_API_KEY for live research.`,
    sourceUrls: [s.website],
    confidenceScore: 0.55,
  }));
}

async function saveToSupabase(lead: EnrichedCompanyLead, status: string) {
  const config = getSupabaseConfig();
  if (!config.configured) return { companyId: null, contactId: null, leadId: null };

  const companyId = randomUUID();
  const contactId = randomUUID();
  const leadId = randomUUID();

  await upsertSupabaseRow("companies", {
    id: companyId,
    name: lead.companyName,
    website: lead.website,
    country: lead.country,
    city: lead.city,
    segment: lead.segment,
    description: lead.description,
    source_urls: lead.sourceUrls,
    confidence_score: lead.confidenceScore,
    created_at: new Date().toISOString(),
  });

  await upsertSupabaseRow("contacts", {
    id: contactId,
    company_id: companyId,
    name: lead.contactName || lead.companyName,
    email: lead.publicEmail,
    phone: lead.publicPhone,
    linkedin_url: lead.linkedinUrl,
    contact_page: lead.contactPage,
    decision_makers: lead.decisionMakers,
    created_at: new Date().toISOString(),
  });

  await upsertSupabaseRow("leads", {
    id: leadId,
    company_id: companyId,
    contact_id: contactId,
    company_name: lead.companyName,
    country: lead.country,
    segment: lead.segment,
    email: lead.publicEmail,
    phone: lead.publicPhone,
    website: lead.website,
    status,
    confidence_score: lead.confidenceScore,
    source_urls: lead.sourceUrls,
    auction_relevance: lead.auctionRelevance,
    created_at: new Date().toISOString(),
  });

  return { companyId, contactId, leadId };
}

async function saveToPrisma(lead: EnrichedCompanyLead) {
  const company = await prisma.company.create({
    data: {
      name: lead.companyName,
      country: lead.country || undefined,
      website: lead.website || undefined,
      segment: lead.segment || undefined,
      notes: JSON.stringify({
        sourceUrls: lead.sourceUrls,
        auctionRelevance: lead.auctionRelevance,
        recentActivity: lead.recentActivity,
      }),
    },
  });

  const contact = await prisma.contact.create({
    data: {
      name: lead.contactName || lead.companyName,
      email: lead.publicEmail || undefined,
      title: lead.decisionMakers || undefined,
      companyId: company.id,
    },
  });

  const dbLead = await prisma.lead.create({
    data: {
      name: lead.contactName || lead.companyName,
      email: lead.publicEmail || undefined,
      company: lead.companyName,
      country: lead.country || undefined,
      segment: lead.segment || undefined,
      stage: "RESEARCHED",
      source: "tavily",
      notes: lead.description || undefined,
      companyId: company.id,
    },
  });

  return { company, contact, lead: dbLead };
}

async function generateOutreachDraft(lead: EnrichedCompanyLead) {
  const subject = `Bloodstock partnership — ${lead.companyName}`;
  const preview = `Hi ${lead.contactName || lead.companyName} team, we help UK/Ireland bloodstock consignors expand buyer reach ahead of auction season.`;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
          max_tokens: 600,
          system:
            "Write a short professional cold outreach email for BloodstockAI. Never invent contact details. If no email is known, address the company team. Do not claim the email was sent.",
          messages: [
            {
              role: "user",
              content: `Company: ${lead.companyName}\nCountry: ${lead.country}\nSegment: ${lead.segment}\nAuction relevance: ${lead.auctionRelevance}\nPublic email: ${lead.publicEmail || "unknown"}\nSources: ${lead.sourceUrls.join(", ")}`,
            },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content?.find((c: { type: string }) => c.type === "text")?.text;
        if (text) {
          return { subject, preview: text.slice(0, 200), fullMessage: text };
        }
      }
    } catch {
      // fall through to template
    }
  }

  const fullMessage = `${preview}\n\nWe noticed your work in ${lead.auctionRelevance || "UK/Ireland bloodstock"} and would love to explore how BloodstockAI can support consignor outreach and buyer engagement.\n\nWould you be open to a short call next week?\n\nBest,\nBloodstockAI Team`;
  return { subject, preview, fullMessage };
}

export async function createOutreachApprovalCard({
  lead,
  leadId,
  draft,
}: {
  lead: EnrichedCompanyLead;
  leadId?: string;
  draft: { subject: string; preview: string; fullMessage: string };
}) {
  const agent = await prisma.agent.findUnique({ where: { slug: "sophia-bennett" } });
  if (!agent) throw new Error("Sophia Bennett agent not found");

  const emailDraft = await prisma.emailDraft.create({
    data: {
      agentId: agent.id,
      subject: draft.subject,
      body: draft.fullMessage,
      recipient: lead.publicEmail || `${lead.companyName} (no public email found)`,
      status: "PENDING",
    },
  });

  const approval = await prisma.approvalRequest.create({
    data: {
      agentId: agent.id,
      type: "outreach_email",
      title: `Outreach draft — ${lead.companyName}`,
      description: `Cold outreach for ${lead.country || "UK/Ireland"} bloodstock lead`,
      preview: draft.preview,
      riskLevel: lead.publicEmail ? "medium" : "high",
      status: "PENDING",
      leadId,
      emailDraftId: emailDraft.id,
    },
  });

  const supabaseConfig = getSupabaseConfig();
  if (supabaseConfig.configured) {
    await insertSupabaseRows("approval_cards", [
      {
        id: approval.id,
        agent_name: "Sophia Bennett",
        action_type: "outreach_email",
        company: lead.companyName,
        contact: lead.contactName || lead.companyName,
        country: lead.country,
        subject: draft.subject,
        message_preview: draft.preview,
        full_message: draft.fullMessage,
        source_urls: lead.sourceUrls,
        expected_value: 25000,
        risk_level: lead.publicEmail ? "medium" : "high",
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ]);
  }

  return approval.id;
}

export async function runTavilyLeadSearchPipeline(input: TavilyPipelineInput = {}): Promise<TavilyPipelineResult> {
  const country = input.country || "UK and Ireland";
  const segment = input.segment || "bloodstock";
  const auctionFocus = input.auctionFocus || "Tattersalls and Goffs";
  const limit = Math.min(input.limit || 10, 50);

  const warnings: string[] = [];
  const logs: TavilyPipelineLog[] = [];
  const tavily = getTavilyConfig();
  const supabase = getSupabaseConfig();
  const mode: "live" | "mock" = tavily.configured ? "live" : "mock";

  if (!tavily.configured) warnings.push(tavily.warning!);
  if (!supabase.configured) warnings.push(supabase.warning!);
  if (!process.env.HUBSPOT_ACCESS_TOKEN && !process.env.HUBSPOT_API_KEY) {
    warnings.push("HUBSPOT_ACCESS_TOKEN is not set. CRM sync will be skipped.");
  }

  pushLog(logs, "james-carter", "James Carter", `Started Tavily search for ${limit} leads in ${country}.`);
  await logStep("james-carter", `Started Tavily lead search — ${country}, limit ${limit}`);
  await updateAgentState("james-carter", { status: "RESEARCHING", currentTask: `Tavily search: ${country}` });

  let parsed: ParsedCompanyLead[] = [];

  try {
    if (mode === "live") {
      parsed = await findLeadCompanies({ country, segment, auctionFocus, limit });
    } else {
      parsed = mockCompanies(limit, country, segment);
    }
  } catch (err) {
    warnings.push(err instanceof Error ? err.message : "Tavily search failed");
    parsed = mockCompanies(limit, country, segment);
  }

  pushLog(logs, "james-carter", "James Carter", `Found ${parsed.length} candidate companies.`);
  await logStep("james-carter", `Tavily search completed — ${parsed.length} companies`, "success");

  const enriched: EnrichedCompanyLead[] = [];
  const approvalIds: string[] = [];
  let hubspotSynced = 0;

  for (const company of parsed) {
    pushLog(logs, "emma-collins", "Emma Collins", `Enriching company: ${company.companyName}.`);
    await logStep("emma-collins", `Enriching ${company.companyName}`);
    await updateAgentState("emma-collins", { status: "RESEARCHING", currentTask: `Enriching ${company.companyName}` });

    let lead: EnrichedCompanyLead;
    if (mode === "live") {
      try {
        lead = await enrichCompanyLead({
          companyName: company.companyName,
          website: company.website,
          country: company.country,
        });
        lead.sourceUrls = [...new Set([...company.sourceUrls, ...lead.sourceUrls])];
      } catch {
        lead = { ...company, contactPage: null, publicEmail: null, publicPhone: null, linkedinUrl: null, auctionRelevance: company.description, recentActivity: null, decisionMakers: null, contactName: null };
      }
    } else {
      lead = {
        ...company,
        contactPage: company.website ? `${company.website}/contact` : null,
        publicEmail: null,
        publicPhone: null,
        linkedinUrl: null,
        auctionRelevance: auctionFocus,
        recentActivity: null,
        decisionMakers: null,
        contactName: null,
      };
    }

    enriched.push(lead);

    const prismaSaved = await saveToPrisma(lead);
    await saveToSupabase(lead, "researched");

    if (supabase.configured) {
      await insertSupabaseRows("agent_logs", [
        {
          id: randomUUID(),
          agent_slug: "emma-collins",
          agent_name: "Emma Collins",
          message: `Enriched ${lead.companyName}`,
          level: "info",
          created_at: new Date().toISOString(),
        },
      ]);
    }

    pushLog(logs, "oliver-brooks", "Oliver Brooks", `Syncing HubSpot for ${lead.companyName}.`);
    await logStep("oliver-brooks", `HubSpot sync started for ${lead.companyName}`);
    await updateAgentState("oliver-brooks", { status: "UPDATING_CRM", currentTask: `HubSpot: ${lead.companyName}` });

    const hs = await syncLeadToHubSpot({
      companyName: lead.companyName,
      website: lead.website,
      country: lead.country,
      contactName: lead.contactName,
      email: lead.publicEmail,
      phone: lead.publicPhone,
      segment: lead.segment,
      description: lead.description,
      sourceUrls: lead.sourceUrls,
    });

    if (hs.skipped) {
      pushLog(logs, "oliver-brooks", "Oliver Brooks", `HubSpot skipped — token not configured.`, "warn");
    } else if (hs.ok) {
      hubspotSynced += 1;
      pushLog(logs, "oliver-brooks", "Oliver Brooks", `HubSpot synced ${lead.companyName}.`, "success");
    } else {
      pushLog(logs, "oliver-brooks", "Oliver Brooks", `HubSpot sync failed for ${lead.companyName}.`, "warn");
    }

    pushLog(logs, "sophia-bennett", "Sophia Bennett", `Creating outreach draft for ${lead.companyName}.`);
    const draft = await generateOutreachDraft(lead);

    pushLog(logs, "isabella-morgan", "Isabella Morgan", `Reviewing copy for ${lead.companyName}.`);
    await logStep("sophia-bennett", `Draft created for ${lead.companyName}`, "info");

    const approvalId = await createOutreachApprovalCard({
      lead,
      leadId: prismaSaved.lead.id,
      draft,
    });
    approvalIds.push(approvalId);
    pushLog(logs, "sophia-bennett", "Sophia Bennett", `Approval card created for ${lead.companyName}.`, "approval");
    await logStep("sophia-bennett", `Approval card created — ${lead.companyName}`, "approval");
  }

  await updateAgentState("james-carter", { status: "COMPLETED", lastAction: `Tavily pipeline — ${enriched.length} leads` });
  await updateAgentState("emma-collins", { status: "IDLE", lastAction: `Enriched ${enriched.length} companies` });
  await updateAgentState("oliver-brooks", { status: "IDLE", lastAction: `HubSpot synced ${hubspotSynced} leads` });
  await updateAgentState("sophia-bennett", { status: "WAITING_APPROVAL", lastAction: `${approvalIds.length} drafts pending approval` });

  return {
    ok: true,
    mode,
    warnings,
    logs,
    companies: enriched,
    approvalIds,
    hubspotSynced,
    summary: `${mode === "live" ? "Tavily" : "Mock"} pipeline complete — ${enriched.length} leads, ${approvalIds.length} approval cards, ${hubspotSynced} HubSpot syncs.`,
  };
}
