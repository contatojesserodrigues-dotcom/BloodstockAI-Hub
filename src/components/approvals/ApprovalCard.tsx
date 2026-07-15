"use client";

import { memo } from "react";
import { Check, X, Pencil, Loader2, Zap } from "lucide-react";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { getAgent } from "@/lib/agents";

export interface ApprovalItem {
  id: string;
  agentSlug: string;
  type: string;
  title: string;
  description?: string;
  preview?: string;
  riskLevel: string;
  status: string;
  n8nMessage?: string;
}

const riskColors: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-400/10",
  medium: "text-amber-400 bg-amber-400/10",
  high: "text-red-400 bg-red-400/10",
};

export const ApprovalCard = memo(function ApprovalCard({
  item,
  processingId,
  onApprove,
  onReject,
}: {
  item: ApprovalItem;
  processingId: string | null;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  const agent = getAgent(item.agentSlug);
  const isProcessing = processingId === item.id;

  return (
    <div className="glass glass-hover rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {agent && <AgentAvatar name={agent.name} color={agent.avatarColor} size="sm" />}
          <div>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-[11px] text-bs-muted">{agent?.name} - {item.type}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${riskColors[item.riskLevel] || riskColors.low}`}>
          {item.riskLevel} risk
        </span>
      </div>
      {item.description && <p className="mt-3 text-sm text-white/50">{item.description}</p>}
      {item.preview && (
        <div className="mt-3 rounded-xl border border-bs-border bg-black/30 p-4 text-[13px] text-white/60 whitespace-pre-wrap">
          {item.preview}
        </div>
      )}
      {item.status === "PENDING" && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onApprove(item.id)}
            disabled={isProcessing}
            className="bs-btn-primary flex-1 text-xs disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
            ) : (
              <Check className="mr-1 inline h-3 w-3" />
            )}
            {isProcessing ? "Sending to n8n..." : "Approve & Execute"}
          </button>
          <button type="button" className="bs-btn-ghost flex-1 text-xs" disabled={isProcessing}>
            <Pencil className="mr-1 inline h-3 w-3" />Edit
          </button>
          <button
            type="button"
            onClick={() => onReject(item.id)}
            disabled={isProcessing}
            className="bs-btn-ghost text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            <X className="mr-1 inline h-3 w-3" />Reject
          </button>
        </div>
      )}
      {item.status === "APPROVED" && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <Zap className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
          <div>
            <p className="text-xs font-medium text-emerald-400">Approved & executed</p>
            {item.n8nMessage && (
              <p className="mt-0.5 text-[11px] text-white/40">{item.n8nMessage}</p>
            )}
          </div>
        </div>
      )}
      {item.status === "REJECTED" && (
        <p className="mt-3 text-xs text-red-400">Rejected</p>
      )}
    </div>
  );
});
