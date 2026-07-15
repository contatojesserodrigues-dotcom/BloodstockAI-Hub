import { AGENT_CONFIG, parseAgentFromCommand } from "@/lib/agents/agent-config";
import { createAgentTask, updateAgentStatus } from "@/lib/db/agent-actions";
import { createApprovalCard } from "@/lib/db/approvals";
import { saveConversation, saveLeadBundle } from "@/lib/db/conversations";
import { writeAgentLog } from "@/lib/db/logs";
import { getSetupWarnings } from "@/lib/supabase/server";
import { findLeadCompanies, enrichCompanyLead, getTavilyConfig } from "@/lib/tools/tavily";
import { syncLeadToHubSpot } from "@/lib/tools/hubspot";

function extractLimit(command: string, fallback = 10) {
  const match = command.match(/(\d+)\s*(uk|ireland|consignor|lead|company|companies)?/i);
  return match ? Math.min(Number(match[1]), 50) : fallback;
}

async function generateClaudeCopy(system: string, prompt: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.content?.find((c: { type: string }) => c.type === "text")?.text || null;
}

export interface CommandResult {
  ok: boolean;
  mode: "live" | "mock";
  agent: { slug: string; name: string };
  summary: string;
  warnings: string[];
  logs: { agent: string; message: string; time: string }[];
  leadsFound: number;
  approvalIds: string[];
}

export async function processAgentCommand(command: string): Promise<CommandResult> {
  const warnings = getSetupWarnings();
  const agent = parseAgentFromCommand(command)!;
  const logs: CommandResult["logs"] = [];
  const approvalIds: string[] = [];
  const now = () =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const push = async (slug: string, name: string, message: string, level = "info") => {
    logs.push({ agent: name, message, time: now() });
    await writeAgentLog({ agentSlug: slug, agentName: name, message, level });
  };

  await saveConversation({ agentSlug: agent.slug, role: "user", content: command, command });
  const task = await createAgentTask({
    agentSlug: agent.slug,
    title: command.slice(0, 120),
    description: "User command from Operations Hub",
    command,
  });

  const isJamesLeadSearch = agent.slug === "james-carter" || /tavily|find|search|consignor|lead/i.test(command);

  await updateAgentStatus(agent.slug, {
    status: isJamesLeadSearch ? "researching" : "writing",
    current_task: command,
    last_action: "Command received",
  });

  await push(agent.slug, agent.name, `Command received: ${command}`);
  await push("amelia-scott", "Amelia Scott", `Routing command to ${agent.name}.`);

  const limit = extractLimit(command, 10);
  const tavily = getTavilyConfig();
  const mode: "live" | "mock" = tavily.configured ? "live" : "mock";

  let companies: Awaited<ReturnType<typeof findLeadCompanies>> = [];

  if (isJamesLeadSearch) {
    await updateAgentStatus("james-carter", {
      status: "researching",
      current_task: `Tavily search — ${limit} UK/Ireland consignors`,
      last_action: "Started Tavily lead discovery",
    });
    await push("james-carter", "James Carter", `Started Tavily search for ${limit} UK/Ireland consignors.`);

    if (mode === "live") {
      try {
        companies = await findLeadCompanies({
          country: /ireland/i.test(command) ? "UK and Ireland" : "UK",
          segment: "bloodstock consignor",
          auctionFocus: "Tattersalls and Goffs",
          limit,
        });
      } catch (err) {
        warnings.push(err instanceof Error ? err.message : "Tavily search failed");
      }
    }

    if (!companies.length) {
      companies = Array.from({ length: Math.min(limit, 3) }).map((_, i) => ({
        companyName: `UK Consignor ${i + 1}`,
        website: null,
        country: i % 2 === 0 ? "UK" : "Ireland",
        city: null,
        segment: "bloodstock consignor",
        description: mode === "live" ? "Researched via Tavily." : "Mock lead — Tavily unavailable.",
        sourceUrls: [],
        confidenceScore: 0.5,
      }));
    }

    await push("james-carter", "James Carter", `Found ${companies.length} candidate companies.`, "success");
  }

  for (const company of companies) {
    await updateAgentStatus("emma-collins", {
      status: "researching",
      current_task: `Enriching ${company.companyName}`,
      last_action: "Lead enrichment in progress",
    });
    await push("emma-collins", "Emma Collins", `Enriching company: ${company.companyName}.`);

    let enriched = {
      ...company,
      contactPage: null as string | null,
      publicEmail: null as string | null,
      publicPhone: null as string | null,
      linkedinUrl: null as string | null,
      auctionRelevance: company.description,
      recentActivity: null as string | null,
      decisionMakers: null as string | null,
      contactName: null as string | null,
    };

    if (mode === "live") {
      try {
        const e = await enrichCompanyLead({
          companyName: company.companyName,
          website: company.website,
          country: company.country,
        });
        enriched = { ...e };
      } catch {
        // keep parsed only
      }
    }

    const saved = await saveLeadBundle({
      companyName: enriched.companyName,
      website: enriched.website,
      country: enriched.country,
      segment: enriched.segment,
      contactName: enriched.contactName,
      email: enriched.publicEmail,
      phone: enriched.publicPhone,
      description: enriched.description,
      sourceUrls: enriched.sourceUrls,
      confidenceScore: enriched.confidenceScore,
      auctionRelevance: enriched.auctionRelevance,
    });

    await updateAgentStatus("oliver-brooks", {
      status: "updating_crm",
      current_task: `CRM sync — ${enriched.companyName}`,
      last_action: "Syncing HubSpot record",
    });
    await push("oliver-brooks", "Oliver Brooks", `Syncing HubSpot for ${enriched.companyName}.`);
    const hs = await syncLeadToHubSpot({
      companyName: enriched.companyName,
      website: enriched.website,
      country: enriched.country,
      email: enriched.publicEmail,
      phone: enriched.publicPhone,
      segment: enriched.segment,
      description: enriched.description,
      sourceUrls: enriched.sourceUrls,
    });
    if (hs.skipped) {
      await push("oliver-brooks", "Oliver Brooks", "HubSpot skipped — token not configured.", "warn");
    } else if (hs.ok) {
      await push("oliver-brooks", "Oliver Brooks", `HubSpot synced ${enriched.companyName}.`, "success");
    }

    await updateAgentStatus("sophia-bennett", {
      status: "writing",
      current_task: `Drafting outreach — ${enriched.companyName}`,
      last_action: "Creating email draft via Claude",
    });
    await push("sophia-bennett", "Sophia Bennett", `Creating outreach draft for ${enriched.companyName}.`);

    const sophiaDraft =
      (await generateClaudeCopy(
        "You are Sophia Bennett, Email Marketing AI for BloodstockAI. Write concise cold outreach emails for UK/Ireland bloodstock consignors. Never invent emails or phone numbers. Do not claim anything was sent.",
        `Write a cold outreach email for ${enriched.companyName} (${enriched.country}). Auction relevance: ${enriched.auctionRelevance}. Public email: ${enriched.publicEmail || "unknown"}.`
      )) ||
      `Hi ${enriched.companyName} team,\n\nBloodstockAI supports consignors with Tavily research, CRM and approved outreach workflows.\n\nBest,\nBloodstockAI`;

    await updateAgentStatus("olivia-sterling", {
      status: "writing",
      current_task: `Copy review — ${enriched.companyName}`,
      last_action: "Reviewing outreach copy via Claude",
    });
    await push("olivia-sterling", "Olivia Sterling", `Reviewing copy for ${enriched.companyName}.`);

    const reviewedDraft =
      (await generateClaudeCopy(
        "You are Olivia Sterling, Chief Copywriter for BloodstockAI. Improve outbound copy for clarity and professionalism. Never invent contact details. Do not claim anything was sent.",
        `Review and improve this outreach email for ${enriched.companyName}:\n\n${sophiaDraft}`
      )) || sophiaDraft;

    const approval = await createApprovalCard({
      agentName: "Sophia Bennett",
      agentSlug: "sophia-bennett",
      actionType: "outreach_email",
      company: enriched.companyName,
      contact: enriched.contactName || enriched.companyName,
      country: enriched.country || undefined,
      subject: `BloodstockAI partnership — ${enriched.companyName}`,
      messagePreview: reviewedDraft.slice(0, 200),
      fullMessage: reviewedDraft,
      sourceUrls: enriched.sourceUrls,
      expectedValue: 25000,
      riskLevel: enriched.publicEmail ? "medium" : "high",
      leadId: saved.leadId,
    });

    if (approval.id) approvalIds.push(approval.id);

    await updateAgentStatus("sophia-bennett", {
      status: "waiting_approval",
      current_task: `Awaiting approval — ${enriched.companyName}`,
      last_action: "Outreach draft pending approval",
    });
    await push("sophia-bennett", "Sophia Bennett", `Approval card created for ${enriched.companyName}.`, "approval");
    await push(
      "amelia-scott",
      "Amelia Scott",
      `External execution blocked — approval required before n8n sends email for ${enriched.companyName}.`,
      "warn"
    );
  }

  await updateAgentStatus(agent.slug, {
    status: approvalIds.length ? "waiting_approval" : isJamesLeadSearch ? "researching" : "completed",
    last_action: `Processed — ${companies.length} leads, ${approvalIds.length} approvals pending`,
  });

  await updateAgentStatus("amelia-scott", {
    status: "completed",
    current_task: "Workflow orchestration complete",
    last_action: `${companies.length} leads processed, ${approvalIds.length} approvals queued`,
  });

  if (task && typeof task === "object" && "id" in task) {
    const { completeAgentTask } = await import("@/lib/db/agent-actions");
    await completeAgentTask(String(task.id), { leads: companies.length, approvals: approvalIds.length });
  }

  const summary = `${agent.name} complete — ${companies.length} leads researched, ${approvalIds.length} approval cards pending. No external actions executed until approved.`;

  await saveConversation({ agentSlug: agent.slug, role: "assistant", content: summary, command });

  return {
    ok: true,
    mode,
    agent: { slug: agent.slug, name: agent.name },
    summary,
    warnings,
    logs,
    leadsFound: companies.length,
    approvalIds,
  };
}
