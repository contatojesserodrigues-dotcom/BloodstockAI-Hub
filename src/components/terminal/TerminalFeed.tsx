"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

type TerminalLog = { id: string; time: string; agent: string; message: string };

const TerminalLine = memo(function TerminalLine({ log }: { log: TerminalLog }) {
  return (
    <div className="animate-terminal-line flex gap-3 py-1 text-white/70">
      <span className="shrink-0 text-bs-accent terminal-glow">[{log.time}]</span>
      <span className="shrink-0 text-white/90">{log.agent}</span>
      <span className="text-white/50">{log.message}</span>
    </div>
  );
});

export function TerminalFeed({ live = false }: { live?: boolean }) {
  const storeLogs = useAppStore((s) => s.terminalLogs);
  const [logs, setLogs] = useState<TerminalLog[]>([]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs?limit=50");
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch {
      // keep existing logs on error
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, live ? 3000 : 8000);
    return () => clearInterval(interval);
  }, [fetchLogs, live]);

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

  return (
    <div className="glass rounded-2xl p-4 font-mono text-[13px]">
      <div className="mb-3 flex items-center justify-between border-b border-bs-border pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="text-xs text-bs-muted">
            {live ? "Live Terminal — n8n feed" : "Agent Terminal — n8n feed"}
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
      <div className="max-h-[500px] space-y-1 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-xs text-bs-muted">Waiting for n8n agent activity...</p>
        ) : (
          logs.map((log) => <TerminalLine key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}
