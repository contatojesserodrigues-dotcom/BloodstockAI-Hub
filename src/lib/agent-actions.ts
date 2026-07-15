export type AgentActionId =
  | "find_leads"
  | "research_leads"
  | "sync_crm"
  | "draft_emails"
  | "follow_up_leads"
  | "customer_checkin"
  | "find_partnerships"
  | "market_brief"
  | "create_content"
  | "roadmap_review"
  | "orchestrate"
  | "ceo_report";

export interface AgentActionDef {
  id: AgentActionId;
  label: string;
  description: string;
  n8nType?: string;
  webhookPath?: string;
  updatesStatus?: string;
  updatesTask?: string;
}

export const AGENT_ACTIONS: Record<string, AgentActionDef> = {
  "james-carter": {
    id: "find_leads",
    label: "Find Leads",
    description: "Search Tavily for UK/Ireland consignors, breeders and stud farms",
    n8nType: "consignor-workflow",
    updatesStatus: "RESEARCHING",
    updatesTask: "Searching Tavily for consignor leads",
  },
  "emma-collins": {
    id: "research_leads",
    label: "Research Leads",
    description: "Build company dossiers and auction participation profiles",
    n8nType: "agent-command",
    updatesStatus: "RESEARCHING",
    updatesTask: "Researching lead profiles and decision-makers",
  },
  "oliver-brooks": {
    id: "sync_crm",
    label: "Sync CRM",
    description: "Update HubSpot contacts, companies and pipeline stages",
    n8nType: "agent-command",
    updatesStatus: "UPDATING_CRM",
    updatesTask: "Syncing HubSpot pipeline records",
  },
  "sophia-bennett": {
    id: "draft_emails",
    label: "Draft Emails",
    description: "Create personalized outreach drafts for approval",
    n8nType: "agent-command",
    updatesStatus: "WAITING_APPROVAL",
    updatesTask: "Drafting personalized auction outreach emails",
  },
  "olivia-sterling": {
    id: "draft_emails",
    label: "Review Copy",
    description: "Review and polish outbound copy before approval",
    n8nType: "agent-command",
    updatesStatus: "WRITING",
    updatesTask: "Reviewing outreach copy for approval queue",
  },
  "ethan-walker": {
    id: "follow_up_leads",
    label: "Follow Up",
    description: "Review warm leads and schedule follow-up actions",
    n8nType: "agent-command",
    updatesStatus: "RESEARCHING",
    updatesTask: "Reviewing warm leads for follow-up",
  },
  "isabella-morgan": {
    id: "customer_checkin",
    label: "Check In",
    description: "Run onboarding and renewal check-in workflows",
    n8nType: "agent-command",
    updatesStatus: "WRITING",
    updatesTask: "Running customer success check-ins",
  },
  "victoria-green": {
    id: "find_partnerships",
    label: "Find Partners",
    description: "Identify stud farms and partnership opportunities",
    n8nType: "agent-command",
    updatesStatus: "RESEARCHING",
    updatesTask: "Scanning partnership opportunities",
  },
  "liam-foster": {
    id: "market_brief",
    label: "Market Brief",
    description: "Compile auction market intelligence digest",
    n8nType: "agent-command",
    updatesStatus: "MONITORING",
    updatesTask: "Compiling auction market intelligence brief",
  },
  "charlotte-hughes": {
    id: "create_content",
    label: "Create Content",
    description: "Draft LinkedIn and social campaign content",
    n8nType: "agent-command",
    updatesStatus: "WRITING",
    updatesTask: "Creating social media campaign content",
  },
  "noah-richardson": {
    id: "roadmap_review",
    label: "Review Roadmap",
    description: "Aggregate product feedback and roadmap priorities",
    n8nType: "agent-command",
    updatesStatus: "RESEARCHING",
    updatesTask: "Reviewing product roadmap priorities",
  },
  "amelia-scott": {
    id: "orchestrate",
    label: "Orchestrate",
    description: "Coordinate tasks across all agents without duplication",
    n8nType: "consignor-workflow",
    updatesStatus: "COMPLETED",
    updatesTask: "Orchestrating multi-agent workflow",
  },
  "evelyn-stone": {
    id: "ceo_report",
    label: "CEO Report",
    description: "Generate executive summary with pipeline metrics",
    n8nType: "agent-command",
    updatesStatus: "WRITING",
    updatesTask: "Preparing CEO executive summary",
  },
  "alexander-knight": {
    id: "ceo_report",
    label: "Revenue Analysis",
    description: "Analyse revenue, conversion and annual plan strategy",
    n8nType: "agent-command",
    updatesStatus: "ANALYZING",
    updatesTask: "Analysing pipeline conversion and revenue forecast",
  },
};

export function getAgentAction(slug: string) {
  return AGENT_ACTIONS[slug];
}

export function buildActionCommand(slug: string, action: AgentActionDef) {
  const commands: Record<AgentActionId, string> = {
    find_leads: "Find 50 UK and Ireland consignors for upcoming thoroughbred auctions",
    research_leads: "Research lead profiles, auction participation and decision-makers",
    sync_crm: "Sync HubSpot contacts, companies and pipeline stages",
    draft_emails: "Draft personalized auction outreach emails for pending leads",
    follow_up_leads: "Review warm leads and prepare follow-up actions",
    customer_checkin: "Run customer onboarding and renewal check-ins",
    find_partnerships: "Identify stud farm and auction house partnership opportunities",
    market_brief: "Compile Tattersalls and Goffs auction market intelligence brief",
    create_content: "Create LinkedIn and Instagram campaign content for auction season",
    roadmap_review: "Review product roadmap priorities and feature specs",
    orchestrate: "Orchestrate UK/Ireland consignor workflow across all agents",
    ceo_report: "Generate CEO executive summary with pipeline and revenue metrics",
  };
  return commands[action.id];
}
