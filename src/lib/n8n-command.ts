import { AGENTS, ROOMS } from "@/lib/agents";
import { getDbAgentBySlug, logAgentActivity } from "@/lib/agent-service";
import { prisma } from "@/lib/prisma";
import type { AgentStatus, ApprovalStatus } from "@prisma/client";

const DEPARTMENT_LABELS: Record<string, string> = {
  sales: "Sales",
  research: "Lead Research",
  crm: "CRM",
  email: "Email Marketing",
  success: "Customer Success",
  partnerships: "Partnerships",
  market: "Market Intelligence",
  social: "Social Media",
  product: "Product",
  boardroom: "Operations",
  ceo: "Executive",
};

export interface N8nCommandPayload {
  agentId: string;
  agentName: string;
  command: string;
  department: string;
  requiresApproval: boolean;
  source: string;
  timestamp: string;
}

import type { N8nApprovalCard, N8nAgentStatus, N8nCommandResult, N8nLogEntry } from "@/lib/n8n-types";

export function parseAgentFromCommand(command: string, agentSlug?: string) {
  if (agentSlug) return AGENTS.find((a) => a.slug === agentSlug) || null;

  const lower = command.toLowerCase();
  for (const agent of AGENTS) {
    const firstName = agent.name.split(" ")[0].toLowerCase();
    const lastName = agent.name.split(" ")[1]?.toLowerCase();
    if (
      lower.includes(agent.slug) ||
      lower.includes(firstName) ||
      (lastName && lower.includes(lastName))
    ) {
      return agent;
    }
  }
  return AGENTS.find((a) => a.slug === "amelia-scott") || null;
}

export function buildN8nPayload(command: string, agentSlug?: string): N8nCommandPayload {
  const agent = parseAgentFromCommand(command, agentSlug)!;
  const room = ROOMS.find((r) => r.id === agent.room);
  return {
    agentId: agent.slug,
    agentName: agent.name,
    command,
    department: DEPARTMENT_LABELS[agent.room] || room?.name || "Operations",
    requiresApproval: true,
    source: "BloodstockAI Operations Hub",
    timestamp: new Date().toISOString(),
  };
}

export async function sendCommandToN8nServer(
  command: string,
  agentSlug?: string
): Promise<N8nCommandResult> {
  const webhookUrl =
    process.env.N8N_AGENT_WEBHOOK_URL ||
    `${process.env.N8N_BASE_URL || "https://bloodstockai.app.n8n.cloud"}/webhook/agent-command`;

  const payload = buildN8nPayload(command, agentSlug);
  const n8nMcpUrl = `${process.env.N8N_BASE_URL || "https://bloodstockai.app.n8n.cloud"}/mcp-server/http`;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.N8N_API_KEY) {
      headers.Authorization = `Bearer ${process.env.N8N_API_KEY}`;
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...payload,
        hubUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.HUB_URL || "http://localhost:3000",
        n8nMcpUrl,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const text = await res.text();
    let raw: unknown;
    try {
      raw = text ? JSON.parse(text) : null;
    } catch {
      raw = { message: text };
    }

    const parsed = normalizeN8nResponse(raw, payload, res.ok);
    await persistN8nResult(parsed, payload.agentId);
    return { ...parsed, n8nUrl: n8nMcpUrl, raw };
  } catch (err) {
    const fallback = buildFallbackResult(command, payload, err);
    await persistN8nResult(fallback, payload.agentId);
    return fallback;
  }
}

function normalizeN8nResponse(
  raw: unknown,
  payload: N8nCommandPayload,
  ok: boolean
): Omit<N8nCommandResult, "n8nUrl" | "raw"> {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const summary =
    (typeof obj.summary === "string" && obj.summary) ||
    (typeof obj.message === "string" && obj.message) ||
    (typeof obj.response === "string" && obj.response) ||
    `Command sent to n8n for ${payload.agentName}. Awaiting agent response and approval cards.`;

  const logs = extractArray<N8nLogEntry>(obj.logs || obj.liveLogs || obj.terminal);
  const approvals = extractArray<N8nApprovalCard>(obj.approvals || obj.approvalCards);
  const agentStatus = extractArray<N8nAgentStatus>(obj.agentStatus || obj.agents || obj.status);

  if (agentStatus.length === 0 && payload.agentId) {
    agentStatus.push({
      agentId: payload.agentId,
      agentName: payload.agentName,
      status: ok ? "RESEARCHING" : "IDLE",
      currentTask: payload.command,
      lastAction: ok ? "Command dispatched to n8n" : "n8n unreachable",
    });
  }

  if (logs.length === 0) {
    logs.push({
      agent: payload.agentName,
      agentSlug: payload.agentId,
      message: ok
        ? `Command received by n8n: ${payload.command}`
        : `Command queued locally — configure N8N_AGENT_WEBHOOK_URL`,
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      level: ok ? "info" : "warning",
    });
  }

  return {
    ok,
    summary,
    agentStatus,
    logs,
    approvals,
    error: ok ? undefined : "n8n webhook returned an error",
  };
}

function buildFallbackResult(
  command: string,
  payload: N8nCommandPayload,
  err: unknown
): N8nCommandResult {
  const n8nMcpUrl = `${process.env.N8N_BASE_URL || "https://bloodstockai.app.n8n.cloud"}/mcp-server/http`;
  return {
    ok: false,
    n8nUrl: n8nMcpUrl,
    summary: `Command logged for ${payload.agentName}. n8n is not reachable — check N8N_AGENT_WEBHOOK_URL and activate the agent-command workflow.`,
    agentStatus: [
      {
        agentId: payload.agentId,
        agentName: payload.agentName,
        status: "RESEARCHING",
        currentTask: command,
        lastAction: "Command queued — n8n connection pending",
      },
    ],
    logs: [
      {
        agent: payload.agentName,
        agentSlug: payload.agentId,
        message: `Command queued: ${command}`,
        level: "warning",
      },
    ],
    approvals: [],
    error: err instanceof Error ? err.message : "Failed to reach n8n",
  };
}

function extractArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function persistN8nResult(result: Omit<N8nCommandResult, "n8nUrl" | "raw">, defaultSlug: string) {
  for (const status of result.agentStatus) {
    const slug = status.agentSlug || status.agentId || defaultSlug;
    const dbAgent = await getDbAgentBySlug(slug);
    if (!dbAgent) continue;
    await prisma.agent.update({
      where: { id: dbAgent.id },
      data: {
        ...(status.status ? { status: status.status as AgentStatus } : {}),
        ...(status.currentTask ? { currentTask: status.currentTask } : {}),
        ...(status.lastAction ? { lastAction: status.lastAction } : {}),
      },
    });
  }

  for (const log of result.logs) {
    const slug = log.agentSlug || parseAgentFromCommand(log.agent || "")?.slug || defaultSlug;
    await logAgentActivity(slug, log.message, log.level || "info");
  }

  for (const card of result.approvals) {
    const slug = card.agentSlug || parseAgentFromCommand(card.agentName || "")?.slug || defaultSlug;
    const agent = await getDbAgentBySlug(slug);
    if (!agent) continue;

    const existing = card.id
      ? await prisma.approvalRequest.findUnique({ where: { id: card.id } })
      : await prisma.approvalRequest.findFirst({
          where: { agentId: agent.id, title: card.title, status: "PENDING" },
        });

    if (existing) continue;

    await prisma.approvalRequest.create({
      data: {
        agentId: agent.id,
        type: card.type || "Agent Action",
        title: card.title,
        description: card.description,
        preview: card.preview,
        riskLevel: card.riskLevel || "medium",
        status: (card.status as ApprovalStatus) || "PENDING",
      },
    });

    await prisma.agent.update({
      where: { id: agent.id },
      data: { status: "WAITING_APPROVAL", lastAction: `Approval required: ${card.title}` },
    });
  }
}
