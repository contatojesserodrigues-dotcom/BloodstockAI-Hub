export type AgentStatus =
  | "idle"
  | "researching"
  | "writing"
  | "waiting_approval"
  | "sending_approved"
  | "updating_crm"
  | "meeting_scheduled"
  | "monitoring"
  | "analyzing"
  | "error"
  | "completed";

export type PipelineStage =
  | "new_lead"
  | "researched"
  | "contact_drafted"
  | "waiting_approval"
  | "contact_approved"
  | "contacted"
  | "opened"
  | "replied"
  | "meeting_booked"
  | "proposal_sent"
  | "negotiation"
  | "won"
  | "lost";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "edited";

export interface AgentRecord {
  id: string;
  slug: string;
  name: string;
  role: string;
  department: string;
  room?: string | null;
  bio?: string | null;
  status: AgentStatus;
  current_task?: string | null;
  last_action?: string | null;
  tools: string[];
  avatar_color?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AgentLogRecord {
  id: string;
  agent_slug: string;
  agent_name: string;
  message: string;
  level: string;
  created_at: string;
}

export interface ApprovalCardRecord {
  id: string;
  agent_name: string;
  action_type: string;
  company?: string | null;
  contact?: string | null;
  country?: string | null;
  subject?: string | null;
  message_preview?: string | null;
  full_message?: string | null;
  source_urls?: string[];
  expected_value?: number;
  risk_level?: string;
  status: ApprovalStatus;
  created_at: string;
}

export interface LeadRecord {
  id: string;
  company_name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  country?: string | null;
  segment?: string | null;
  stage: PipelineStage;
  value?: number;
  source?: string | null;
  notes?: string | null;
  confidence_score?: number;
  source_urls?: string[];
  created_at: string;
}

export interface ConversationRecord {
  id: string;
  agent_slug?: string | null;
  role: string;
  content: string;
  command?: string | null;
  created_at: string;
}

export interface AgentTaskRecord {
  id: string;
  agent_slug: string;
  title: string;
  description?: string | null;
  command?: string | null;
  status: string;
  created_at: string;
}

export interface SetupWarning {
  source: "supabase" | "tavily" | "hubspot" | "n8n" | "claude";
  message: string;
}
