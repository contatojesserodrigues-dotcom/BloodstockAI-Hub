"use client";

import { useEffect, useState } from "react";
import { Send, Bot, ExternalLink } from "lucide-react";
import { getAgent } from "@/lib/agents";
import { sendCommandToN8N } from "@/lib/n8n-client";
import { useAppStore } from "@/store/useAppStore";
import { AgentAvatar } from "@/components/ui/AgentAvatar";

interface Message {
  role: "user" | "assistant";
  content: string;
  agent?: string;
  source?: string;
  n8nUrl?: string;
}

export function ChatInterface({ agentSlug }: { agentSlug?: string }) {
  const agent = agentSlug ? getAgent(agentSlug) : null;
  const setN8nCommandResult = useAppStore((s) => s.setN8nCommandResult);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: agent
        ? `Hello, I'm ${agent.name}. Commands route through Supabase + Claude — no emails or CRM updates happen without your approval.`
        : 'Kuiper Agents Hub Center ready. Try: "Find leads" or open Agent Builder',
      agent: agent?.name,
      source: "n8n",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentSlug) return;
    fetch(`/api/conversations?agentSlug=${agentSlug}&limit=20`)
      .then((r) => r.json())
      .then((history) => {
        if (Array.isArray(history) && history.length > 0) {
          setMessages(
            history.map((m: { role: string; content: string; agentName?: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
              agent: m.agentName,
              source: "n8n",
            }))
          );
        }
      })
      .catch(() => {});
  }, [agentSlug]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const hubRes = await fetch("/api/agents/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: userMsg }),
      });

      if (hubRes.ok) {
        const hub = await hubRes.json();
        hub.logs?.forEach((log: { agent: string; message: string; time: string }, i: number) => {
          useAppStore.getState().addLog({ time: log.time, agent: log.agent, message: log.message });
        });
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `${hub.summary}${hub.warnings?.length ? `\n\nWarnings:\n${hub.warnings.join("\n")}` : ""}`,
            agent: hub.agent?.name || "Amelia Scott",
            source: hub.mode === "live" ? "supabase" : "mock",
          },
        ]);
        return;
      }

      const result = await sendCommandToN8N(userMsg, agentSlug);
      setN8nCommandResult(result);

      const statusLines = result.agentStatus
        .map((s) => `• ${s.agentName}: ${s.status}${s.currentTask ? ` — ${s.currentTask}` : ""}`)
        .join("\n");

      const approvalLines =
        result.approvals.length > 0
          ? `\n\nPending approvals (${result.approvals.length}):\n${result.approvals.map((a) => `• ${a.title}`).join("\n")}`
          : "";

      const logLines =
        result.logs.length > 0
          ? `\n\nLive logs:\n${result.logs.map((l) => `• [${l.agent}] ${l.message}`).join("\n")}`
          : "";

      const content = `${result.summary}${statusLines ? `\n\nAgent status:\n${statusLines}` : ""}${logLines}${approvalLines}`;

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content,
          agent: result.agentStatus[0]?.agentName || agent?.name || "Amelia Scott",
          source: "n8n",
          n8nUrl: result.n8nUrl,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Failed to send command to n8n",
          agent: "System",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass flex h-[min(70vh,600px)] min-h-[360px] flex-col rounded-2xl sm:min-h-[420px] sm:h-[500px] lg:h-[600px]">
      <div className="flex items-center gap-3 border-b border-bs-border p-4">
        {agent ? (
          <>
            <AgentAvatar name={agent.name} color={agent.avatarColor} size="sm" />
            <div>
              <p className="text-sm font-medium">{agent.name}</p>
              <p className="text-[11px] text-bs-muted">{agent.title} — via n8n</p>
            </div>
          </>
        ) : (
          <>
            <Bot className="h-5 w-5 text-bs-accent" />
            <div>
              <p className="text-sm font-medium">Quick Command</p>
              <p className="text-[11px] text-bs-muted">Routes to n8n — approval required</p>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-bs-accent text-white"
                  : "border border-bs-border bg-white/[0.03] text-white/80"
              }`}
            >
              {msg.agent && msg.role === "assistant" && (
                <p className="mb-1 text-[10px] font-medium text-bs-accent-light">
                  {msg.agent}
                  {msg.source && <span className="ml-1 text-white/30">via {msg.source}</span>}
                </p>
              )}
              {msg.content}
              {msg.n8nUrl && (
                <a
                  href={msg.n8nUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-[10px] text-bs-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> n8n MCP Server
                </a>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-1 px-4">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bs-accent" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bs-accent delay-100" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bs-accent delay-200" />
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-bs-border p-4">
        <div className="flex gap-2">
          <input
            className="bs-input flex-1"
            placeholder={agent ? `Command ${agent.name.split(" ")[0]}...` : 'Try: "James, find 50 consignors in Ireland"'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="bs-btn-primary px-4" disabled={loading}>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
