import type { N8nCommandResult } from "@/lib/n8n-types";

export async function sendCommandToN8N(
  command: string,
  agentSlug?: string
): Promise<N8nCommandResult> {
  const res = await fetch("/api/n8n/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, agentSlug }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to send command to n8n");
  }

  return res.json();
}
