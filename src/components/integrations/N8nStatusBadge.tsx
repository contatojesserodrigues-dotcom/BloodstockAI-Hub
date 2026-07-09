"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Workflow } from "lucide-react";

export function N8nStatusBadge() {
  const [status, setStatus] = useState<{ connected: boolean; message: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/n8n/status", { signal: controller.signal })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {
        if (!controller.signal.aborted) {
          setStatus({ connected: false, message: "Offline" });
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <a
      href="https://bloodstockai.app.n8n.cloud/"
      target="_blank"
      rel="noopener noreferrer"
      className="glass glass-hover flex items-center gap-3 rounded-xl px-4 py-2.5"
    >
      <Workflow className="h-4 w-4 text-bs-accent" />
      <div>
        <p className="text-xs font-medium">n8n Automation</p>
        <p className="text-[10px] text-bs-muted">
          {status?.connected ? (
            <span className="text-emerald-400">Connected</span>
          ) : (
            <span className="text-amber-400">{status ? "Offline" : "Checking..."}</span>
          )}
          {" - bloodstockai.app.n8n.cloud"}
        </p>
      </div>
      <ExternalLink className="ml-auto h-3 w-3 text-white/30" />
    </a>
  );
}
