import { NextResponse } from "next/server";
import { triggerAgentCommand, triggerConsignorWorkflow, triggerN8nWebhook, N8N_CONFIG } from "@/lib/n8n";

export async function POST(request: Request) {
  const body = await request.json();
  const { type, command, agentSlug, webhookPath, payload } = body;

  let result;

  if (type === "consignor-workflow") {
    result = await triggerConsignorWorkflow();
  } else if (type === "agent-command" && command) {
    result = await triggerAgentCommand(command, agentSlug);
  } else if (webhookPath && payload) {
    result = await triggerN8nWebhook(webhookPath, payload);
  } else {
    return NextResponse.json({ error: "Invalid trigger payload" }, { status: 400 });
  }

  return NextResponse.json({
    ...result,
    n8nBaseUrl: N8N_CONFIG.baseUrl,
    note: result.ok
      ? "Workflow triggered on n8n"
      : "n8n webhook not reachable - running in local simulation mode. Configure N8N_WEBHOOK_* paths in .env",
  });
}
