"use client";

import { useCallback, useState } from "react";
import { Play, Zap, ExternalLink } from "lucide-react";
import { sendCommandToN8N } from "@/lib/n8n-client";
import { useAppStore } from "@/store/useAppStore";

export function WorkflowTrigger() {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const setN8nCommandResult = useAppStore((s) => s.setN8nCommandResult);

  const runWorkflow = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setStatus(null);

    try {
      const result = await sendCommandToN8N(
        "Find 50 UK and Ireland consignors for upcoming thoroughbred auctions",
        "amelia-scott"
      );
      setN8nCommandResult(result);
      setStatus(
        result.ok
          ? `Workflow sent to n8n — ${result.approvals.length} approval(s), ${result.logs.length} log(s)`
          : result.summary
      );
    } catch {
      setStatus("Failed to trigger workflow via n8n");
    } finally {
      setRunning(false);
    }
  }, [running, setN8nCommandResult]);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-bs-accent" />
            <p className="text-sm font-medium">First Workflow</p>
            <a
              href="https://bloodstockai.app.n8n.cloud/mcp-server/http"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-bs-accent hover:underline"
            >
              n8n MCP <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-[13px] text-bs-muted">
            Find 50 UK and Ireland consignors — routed through n8n, approval required.
          </p>
          <p className="mt-2 text-[11px] text-white/30">
            James - Emma - Oliver - Sophia - Approval - Evelyn
          </p>
          {status && (
            <p className="mt-2 text-[11px] text-bs-accent">{status}</p>
          )}
        </div>
        <button
          type="button"
          onClick={runWorkflow}
          disabled={running}
          className="bs-btn-primary shrink-0 disabled:opacity-50"
        >
          <Play className="mr-2 inline h-4 w-4" />
          {running ? "Sending to n8n..." : "Run Workflow"}
        </button>
      </div>
    </div>
  );
}
