const N8N_BASE_URL = process.env.N8N_BASE_URL || "https://bloodstockai.app.n8n.cloud";
const N8N_WEBHOOK_AGENT = process.env.N8N_WEBHOOK_AGENT || "/webhook/agent-command";
const N8N_WEBHOOK_WORKFLOW = process.env.N8N_WEBHOOK_WORKFLOW || "/webhook/consignor-workflow";
const N8N_WEBHOOK_SEND_APPROVED = process.env.N8N_WEBHOOK_SEND_APPROVED || "/webhook/send-approved-emails";
const N8N_API_KEY = process.env.N8N_API_KEY;

export const N8N_CONFIG = {
  baseUrl: N8N_BASE_URL,
  webhooks: {
    agentCommand: N8N_WEBHOOK_AGENT,
    consignorWorkflow: N8N_WEBHOOK_WORKFLOW,
    sendApproved: N8N_WEBHOOK_SEND_APPROVED,
  },
  dashboardUrl: N8N_BASE_URL,
} as const;

export interface N8nTriggerPayload {
  workflow?: string;
  command?: string;
  agentSlug?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface SendApprovedPayload {
  approvalId: string;
  type: string;
  title: string;
  description?: string | null;
  preview?: string | null;
  approved: boolean;
  approvedBy: string;
  agentSlug: string;
  agentName: string;
  riskLevel: string;
  email?: {
    draftId: string;
    subject: string;
    body: string;
    recipient: string;
  };
  crm?: {
    action: string;
    details: string;
  };
}

export async function triggerN8nWebhook(
  webhookPath: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data?: unknown; error?: string }> {
  const url = `${N8N_BASE_URL.replace(/\/$/, "")}${webhookPath.startsWith("/") ? webhookPath : `/${webhookPath}`}`;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (N8N_API_KEY) {
      headers["Authorization"] = `Bearer ${N8N_API_KEY}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...payload,
        source: "bloodstockai-hub",
        hubUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.HUB_URL || "http://localhost:3000",
        timestamp: new Date().toISOString(),
      }),
    });

    let data: unknown;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : "Failed to reach n8n",
    };
  }
}

export async function checkN8nConnection(): Promise<{
  connected: boolean;
  baseUrl: string;
  message: string;
}> {
  try {
    const res = await fetch(N8N_BASE_URL, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    return {
      connected: res.ok || res.status === 401 || res.status === 405,
      baseUrl: N8N_BASE_URL,
      message: res.ok ? "n8n instance reachable" : `n8n responded with status ${res.status}`,
    };
  } catch {
    return {
      connected: false,
      baseUrl: N8N_BASE_URL,
      message: "Could not reach n8n instance",
    };
  }
}

export async function triggerAgentCommand(command: string, agentSlug?: string) {
  return triggerN8nWebhook(N8N_WEBHOOK_AGENT, {
    workflow: "agent-command",
    command,
    agentSlug,
  });
}

export async function triggerConsignorWorkflow() {
  return triggerN8nWebhook(N8N_WEBHOOK_WORKFLOW, {
    workflow: "consignor-outreach",
    command: "Find 50 UK and Ireland consignors for upcoming thoroughbred auctions",
    agentSlug: "amelia-scott",
    metadata: {
      targetCountries: ["UK", "Ireland"],
      targetCount: 50,
      segment: "consignors",
    },
  });
}

export async function triggerSendApproved(payload: SendApprovedPayload) {
  return triggerN8nWebhook(N8N_WEBHOOK_SEND_APPROVED, {
    workflow: "send-approved",
    ...payload,
  });
}
