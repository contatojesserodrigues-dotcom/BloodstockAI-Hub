/** Native Kuiper workflow engine (n8n-like graph). n8n remains an optional export/sync target. */

export type WorkflowEngine = "native" | "n8n";

export type WorkflowNodeType =
  | "trigger"
  | "action"
  | "condition"
  | "agent"
  | "integration"
  | "delay";

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  kind: string;
  config?: Record<string, unknown>;
  x: number;
  y: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  version: 1;
}

export const TRIGGER_KINDS = [
  { kind: "manual", label: "Manual run" },
  { kind: "email_received", label: "Email received" },
  { kind: "new_lead", label: "New lead" },
  { kind: "calendar_event", label: "Calendar event" },
  { kind: "schedule", label: "Schedule (cron)" },
  { kind: "webhook", label: "Webhook" },
] as const;

export const ACTION_KINDS = [
  { kind: "send_email", label: "Send email" },
  { kind: "create_document", label: "Create document" },
  { kind: "update_crm", label: "Update CRM" },
  { kind: "generate_report", label: "Generate report" },
  { kind: "notify_team", label: "Notify team" },
  { kind: "run_agent", label: "Run AI agent" },
  { kind: "http_request", label: "HTTP request" },
] as const;

export function emptyGraph(): WorkflowGraph {
  return {
    version: 1,
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        label: "Manual run",
        kind: "manual",
        x: 80,
        y: 160,
      },
    ],
    edges: [],
  };
}

export function parseGraph(raw: string | null | undefined): WorkflowGraph {
  if (!raw) return emptyGraph();
  try {
    const parsed = JSON.parse(raw) as WorkflowGraph;
    if (!parsed.nodes || !parsed.edges) return emptyGraph();
    return { ...parsed, version: 1 };
  } catch {
    return emptyGraph();
  }
}

/** Deterministic AI-style graph builder from a natural language brief (no LLM required for scaffold). */
export function buildGraphFromBrief(brief: string): { name: string; graph: WorkflowGraph; summary: string } {
  const lower = brief.toLowerCase();
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  let x = 80;
  const y = 160;
  const gap = 220;

  const add = (node: Omit<WorkflowNode, "x" | "y">) => {
    const full = { ...node, x, y };
    nodes.push(full);
    x += gap;
    return full.id;
  };

  let triggerKind = "manual";
  let triggerLabel = "Manual run";
  if (lower.includes("email")) {
    triggerKind = "email_received";
    triggerLabel = "Email received";
  } else if (lower.includes("lead")) {
    triggerKind = "new_lead";
    triggerLabel = "New lead";
  } else if (lower.includes("calendar") || lower.includes("meeting")) {
    triggerKind = "calendar_event";
    triggerLabel = "Calendar event";
  } else if (lower.includes("every") || lower.includes("daily") || lower.includes("schedule")) {
    triggerKind = "schedule";
    triggerLabel = "Scheduled trigger";
  }

  let prev = add({
    id: "n1",
    type: "trigger",
    label: triggerLabel,
    kind: triggerKind,
  });

  if (lower.includes("research") || lower.includes("enrich") || lower.includes("tavily")) {
    const id = add({
      id: "n2",
      type: "agent",
      label: "Research agent",
      kind: "run_agent",
      config: { agentHint: "james-carter" },
    });
    edges.push({ id: `e-${prev}-${id}`, source: prev, target: id });
    prev = id;
  }

  if (lower.includes("crm") || lower.includes("hubspot")) {
    const id = add({
      id: `n-crm`,
      type: "action",
      label: "Update CRM",
      kind: "update_crm",
    });
    edges.push({ id: `e-${prev}-${id}`, source: prev, target: id });
    prev = id;
  }

  if (lower.includes("email") || lower.includes("outreach") || lower.includes("follow")) {
    const id = add({
      id: `n-email`,
      type: "action",
      label: "Draft / send email",
      kind: "send_email",
      config: { requiresApproval: true },
    });
    edges.push({ id: `e-${prev}-${id}`, source: prev, target: id });
    prev = id;
  }

  if (lower.includes("report") || lower.includes("summary") || lower.includes("notify")) {
    const id = add({
      id: `n-notify`,
      type: "action",
      label: lower.includes("report") ? "Generate report" : "Notify team",
      kind: lower.includes("report") ? "generate_report" : "notify_team",
    });
    edges.push({ id: `e-${prev}-${id}`, source: prev, target: id });
  }

  if (nodes.length === 1) {
    const id = add({
      id: "n-default",
      type: "agent",
      label: "AI agent step",
      kind: "run_agent",
    });
    edges.push({ id: `e-${prev}-${id}`, source: prev, target: id });
    const id2 = add({
      id: "n-default-2",
      type: "action",
      label: "Notify team",
      kind: "notify_team",
    });
    edges.push({ id: `e-${id}-${id2}`, source: id, target: id2 });
  }

  const name =
    brief.trim().slice(0, 60) || "New automation";
  const summary = `Created a ${nodes.length}-step native workflow from your brief. You can edit nodes on the canvas. Optional: sync to n8n later if you already use it.`;

  return { name, graph: { version: 1, nodes, edges }, summary };
}
