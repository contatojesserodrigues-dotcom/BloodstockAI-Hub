export interface N8nExecutePayload {
  action: string;
  approvalId: string;
  agentSlug: string;
  agentName: string;
  company?: string;
  contact?: string;
  subject?: string;
  fullMessage?: string;
  metadata?: Record<string, unknown>;
}

export function getN8nConfig() {
  const url =
    process.env.N8N_AGENT_WEBHOOK_URL ||
    `${process.env.N8N_BASE_URL || "https://bloodstockai.app.n8n.cloud"}/webhook/agent-command`;
  const configured = Boolean(url);
  return {
    configured,
    url,
    warning: configured ? undefined : "N8N_AGENT_WEBHOOK_URL missing — automation execution disabled.",
  };
}

export async function executeApprovedViaN8n(payload: N8nExecutePayload) {
  const cfg = getN8nConfig();
  if (!cfg.configured) {
    return { ok: false, skipped: true, warning: cfg.warning };
  }

  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.N8N_WEBHOOK_SECRET
        ? { "x-hub-secret": process.env.N8N_WEBHOOK_SECRET }
        : {}),
    },
    body: JSON.stringify({
      ...payload,
      source: "BloodstockAI Operations Hub",
      requiresApproval: false,
      approved: true,
      timestamp: new Date().toISOString(),
      hubUrl: process.env.HUB_URL || process.env.NEXT_PUBLIC_APP_URL,
    }),
  });

  if (!res.ok) {
    return { ok: false, error: await res.text() };
  }

  const data = await res.json().catch(() => ({}));
  return { ok: true, data };
}

export async function sendCommandToN8n(command: string, agentSlug: string, agentName: string) {
  const cfg = getN8nConfig();
  if (!cfg.configured) {
    return { ok: false, skipped: true, warning: cfg.warning };
  }

  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId: agentSlug,
      agentName,
      command,
      department: "Operations",
      requiresApproval: true,
      source: "BloodstockAI Operations Hub",
      timestamp: new Date().toISOString(),
      hubUrl: process.env.HUB_URL || process.env.NEXT_PUBLIC_APP_URL,
    }),
  });

  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true, data: await res.json().catch(() => ({})) };
}
