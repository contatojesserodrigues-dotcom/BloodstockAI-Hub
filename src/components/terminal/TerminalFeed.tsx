"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TERMINAL_LOGS } from "@/lib/terminal-logs";

type TerminalLog = { id: string; time: string; agent: string; message: string };

const FALLBACK_LOGS: TerminalLog[] = TERMINAL_LOGS.map((log, index) => ({
  id: `fallback-${index}`,
  time: log.time,
  agent: log.agent,
  message: log.message,
}));

const TerminalLine = memo(function TerminalLine({ log }: { log: TerminalLog }) {
  return (
    <div className="animate-terminal-line flex flex-wrap gap-x-3 gap-y-1 py-1 text-[12px] text-white/70 sm:flex-nowrap sm:text-[13px]">
      <span className="shrink-0 text-bs-accent terminal-glow">[{log.time}]</span>
      <span className="shrink-0 text-white/90">{log.agent}</span>
      <span className="min-w-0 break-words text-white/50">{log.message}</span>
    </div>
  );
});

export function TerminalFeed({ live = false }: { live?: boolean }) {
  const storeLogs = useAppStore((s) => s.terminalLogs);
  const [logs, setLogs] = useState<TerminalLog[]>(FALLBACK_LOGS);
  const [source, setSource] = useState<"supabase" | "mock">("mock");

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/logs?limit=50");
      const data = await res.json();
      if (Array.isArray(data.logs) && data.logs.length > 0) {
        setLogs(data.logs);
        setSource(data.source || "mock");
      } else if (Array.isArray(data) && data.length > 0) {
        setLogs(data);
      }
    } catch {
      setLogs(FALLBACK_LOGS);
      setSource("mock");
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, live ? 3000 : 8000);
    return () => clearInterval(interval);
  }, [fetchLogs, live]);

  useEffect(() => {
    try {
      const client = createSupabaseBrowserClient();
      if (!client || !live) return;

      const channel = client
        .channel("agent_logs_live")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "agent_logs" },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new as {
              id: string;
              agent_name: string;
              message: string;
              created_at: string;
            };
            setLogs((prev) => [
              {
                id: row.id,
                time: new Date(row.created_at).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }),
                agent: row.agent_name,
                message: row.message,
              },
              ...prev,
            ].slice(0, 100));
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } catch {
      return undefined;
    }
  }, [live]);

  useEffect(() => {
    if (storeLogs.length > 0) {
      setLogs((prev) => {
        const merged = [
          ...storeLogs.map((l) => ({ id: l.id, time: l.time, agent: l.agent, message: l.message })),
          ...prev,
        ];
        const seen = new Set<string>();
        return merged
          .filter((l) => {
            if (seen.has(l.id)) return false;
            seen.add(l.id);
            return true;
          })
          .slice(0, 100);
      });
    }
  }, [storeLogs]);

  const displayLogs = useMemo(() => (logs.length > 0 ? logs : FALLBACK_LOGS), [logs]);

  return (
    <div className="glass rounded-2xl p-4 font-mono text-[13px]">
      <div className="mb-3 flex flex-col gap-2 border-b border-bs-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="text-xs text-bs-muted">
            {live ? `Live Terminal — ${source}` : `Agent Terminal — ${source}`}
          </span>
        </div>
        <a
          href="https://bloodstockai.app.n8n.cloud/mcp-server/http"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-bs-accent hover:underline"
        >
          n8n MCP
        </a>
      </div>
      <div className="max-h-[min(50vh,500px)] space-y-1 overflow-y-auto">
        {displayLogs.map((log) => (
          <TerminalLine key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}
