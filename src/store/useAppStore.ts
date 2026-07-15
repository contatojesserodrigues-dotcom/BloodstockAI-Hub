"use client";

import { create } from "zustand";
import type { N8nApprovalCard, N8nAgentStatus } from "@/lib/n8n-types";

export interface TerminalEntry {
  id: string;
  time: string;
  agent: string;
  message: string;
}

export interface StoreApproval {
  id: string;
  agentSlug: string;
  type: string;
  title: string;
  description?: string;
  preview?: string;
  riskLevel: string;
  status: string;
}

interface AppState {
  terminalLogs: TerminalEntry[];
  n8nApprovals: StoreApproval[];
  agentStatuses: N8nAgentStatus[];
  lastSummary: string | null;
  addLog: (entry: Omit<TerminalEntry, "id">) => void;
  setN8nCommandResult: (result: {
    summary: string;
    logs: { agent?: string; message: string; time?: string }[];
    approvals: N8nApprovalCard[];
    agentStatus: N8nAgentStatus[];
  }) => void;
  clearN8nState: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  terminalLogs: [],
  n8nApprovals: [],
  agentStatuses: [],
  lastSummary: null,
  addLog: (entry) =>
    set((s) => ({
      terminalLogs: [
        { ...entry, id: `${Date.now()}-${Math.random()}` },
        ...s.terminalLogs,
      ].slice(0, 100),
    })),
  setN8nCommandResult: (result) =>
    set((s) => {
      const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const newLogs = result.logs.map((log, i) => ({
        id: `n8n-${Date.now()}-${i}`,
        time: log.time || now,
        agent: log.agent || "n8n",
        message: log.message,
      }));
      const newApprovals: StoreApproval[] = result.approvals.map((a, i) => ({
        id: a.id || `n8n-approval-${Date.now()}-${i}`,
        agentSlug: a.agentSlug || "amelia-scott",
        type: a.type || "Agent Action",
        title: a.title,
        description: a.description,
        preview: a.preview,
        riskLevel: a.riskLevel || "medium",
        status: a.status || "PENDING",
      }));
      return {
        lastSummary: result.summary,
        agentStatuses: result.agentStatus,
        terminalLogs: [...newLogs, ...s.terminalLogs].slice(0, 100),
        n8nApprovals: [...newApprovals, ...s.n8nApprovals],
      };
    }),
  clearN8nState: () =>
    set({ terminalLogs: [], n8nApprovals: [], agentStatuses: [], lastSummary: null }),
}));
