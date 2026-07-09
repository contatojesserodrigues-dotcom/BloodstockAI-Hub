export interface N8nLogEntry {
  agent?: string;
  agentSlug?: string;
  message: string;
  time?: string;
  level?: string;
}

export interface N8nApprovalCard {
  id?: string;
  agentSlug?: string;
  agentName?: string;
  type?: string;
  title: string;
  description?: string;
  preview?: string;
  riskLevel?: string;
  status?: string;
}

export interface N8nAgentStatus {
  agentId?: string;
  agentSlug?: string;
  agentName?: string;
  status?: string;
  currentTask?: string;
  lastAction?: string;
}

export interface N8nCommandResult {
  ok: boolean;
  summary: string;
  agentStatus: N8nAgentStatus[];
  logs: N8nLogEntry[];
  approvals: N8nApprovalCard[];
  n8nUrl: string;
  raw?: unknown;
  error?: string;
}
