import { routeGenerate } from "@/lib/ai/router";
import { selectProviderForTask } from "@/lib/ai/router";
import type { LiveAgent } from "@/lib/agent-service";

const SYSTEM_PREFIX = `You are a Kuiper Agents Hub Center virtual agent. Respond professionally and concisely. Never claim to have sent emails or updated CRM without approval. All outbound actions require human approval first.`;

/** @deprecated use selectProviderForTask from @/lib/ai/router */
export function selectProvider(task: string) {
  return selectProviderForTask(task);
}

export async function generateAgentResponse(
  agent: LiveAgent,
  message: string,
  history: { role: string; content: string }[] = []
): Promise<string | null> {
  const system = `${SYSTEM_PREFIX}\n\nYou are ${agent.name}, ${agent.role}.\nBio: ${agent.bio}\nCurrent task: ${agent.currentTask}`;

  return routeGenerate({
    system,
    message,
    history,
    task: message,
  });
}

export function extractN8nResponse(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.response === "string") return obj.response;
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.reply === "string") return obj.reply;
  if (obj.data && typeof obj.data === "object") {
    const nested = obj.data as Record<string, unknown>;
    if (typeof nested.response === "string") return nested.response;
    if (typeof nested.message === "string") return nested.message;
  }
  return null;
}
