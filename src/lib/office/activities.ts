import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  Mail,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface ActivityMeta {
  label: string;
  icon: LucideIcon;
  bubble: string;
  pose: "walk" | "sit" | "stand" | "type" | "talk";
}

const STATUS_ACTIVITY: Record<string, ActivityMeta> = {
  RESEARCHING: {
    label: "Researching",
    icon: Search,
    bubble: "Researching consignors and market data...",
    pose: "type",
  },
  MONITORING: {
    label: "Monitoring",
    icon: BarChart3,
    bubble: "Monitoring auction markets and competitors...",
    pose: "stand",
  },
  UPDATING_CRM: {
    label: "Updating CRM",
    icon: Users,
    bubble: "Updating contacts and pipeline in HubSpot...",
    pose: "type",
  },
  WAITING_APPROVAL: {
    label: "Awaiting approval",
    icon: ShieldCheck,
    bubble: "Draft ready — waiting for human approval...",
    pose: "stand",
  },
  WRITING: {
    label: "Writing",
    icon: FileText,
    bubble: "Writing report and copy for review...",
    pose: "type",
  },
  ANALYZING: {
    label: "Analyzing",
    icon: BarChart3,
    bubble: "Analyzing revenue and conversion data...",
    pose: "sit",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle2,
    bubble: "Task completed — coordinating next steps...",
    pose: "stand",
  },
  SENDING_APPROVED: {
    label: "Sending",
    icon: Send,
    bubble: "Sending approved outreach...",
    pose: "walk",
  },
  IDLE: {
    label: "Available",
    icon: MessageSquare,
    bubble: "Standing by for the next assignment...",
    pose: "walk",
  },
};

export function getActivityMeta(status: string, currentTask?: string): ActivityMeta {
  const key = status.toUpperCase().replace(/-/g, "_");
  const base = STATUS_ACTIVITY[key] || STATUS_ACTIVITY.IDLE;
  return {
    ...base,
    bubble: currentTask?.trim() ? currentTask : base.bubble,
  };
}

export const TASK_FLOW_STEPS = [
  { id: "new", label: "New Task Created", color: "#3B82F6" },
  { id: "assigned", label: "Assigned to Agent", color: "#EAB308" },
  { id: "running", label: "In Execution", color: "#22C55E" },
  { id: "approval", label: "Awaiting Approval", color: "#A855F7" },
  { id: "done", label: "Completed", color: "#15803D" },
] as const;

export function taskFlowStepForStatus(status: string): (typeof TASK_FLOW_STEPS)[number]["id"] {
  const key = status.toUpperCase().replace(/-/g, "_");
  if (key === "WAITING_APPROVAL") return "approval";
  if (key === "COMPLETED") return "done";
  if (["RESEARCHING", "MONITORING", "UPDATING_CRM", "WRITING", "ANALYZING", "SENDING_APPROVED"].includes(key)) {
    return "running";
  }
  if (key === "IDLE") return "assigned";
  return "running";
}
