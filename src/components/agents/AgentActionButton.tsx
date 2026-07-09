"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { sendCommandToN8N } from "@/lib/n8n-client";
import { useAppStore } from "@/store/useAppStore";
import { AGENT_ACTIONS } from "@/lib/agent-actions";

export function AgentActionButton({
  slug,
  label = "Task",
  className = "bs-btn-ghost px-2 py-1 text-[10px]",
}: {
  slug: string;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const setN8nCommandResult = useAppStore((s) => s.setN8nCommandResult);
  const action = AGENT_ACTIONS[slug];

  async function runAction() {
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const command = action
        ? `Run ${action.label}: ${action.description}`
        : `Execute task for agent ${slug}`;
      const result = await sendCommandToN8N(command, slug);
      setN8nCommandResult(result);
      setMessage(result.ok ? "Sent to n8n" : "Queued — check n8n");
    } catch {
      setMessage("Failed to send to n8n");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" onClick={runAction} disabled={loading} className={className}>
        {loading ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null}
        {loading ? "Sending..." : label}
      </button>
      {message && <span className="text-[9px] text-bs-accent">{message}</span>}
    </span>
  );
}
