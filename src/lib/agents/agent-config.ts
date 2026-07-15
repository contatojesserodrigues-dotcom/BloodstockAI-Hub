import type { AgentRecord, AgentStatus } from "@/lib/supabase/types";

export const PIPELINE_STAGES = [
  "New Lead",
  "Researched",
  "Contact Drafted",
  "Waiting Approval",
  "Contact Approved",
  "Contacted",
  "Opened",
  "Replied",
  "Meeting Booked",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
] as const;

export const PIPELINE_STAGE_SLUGS: Record<string, string> = {
  "New Lead": "new_lead",
  Researched: "researched",
  "Contact Drafted": "contact_drafted",
  "Waiting Approval": "waiting_approval",
  "Contact Approved": "contact_approved",
  Contacted: "contacted",
  Opened: "opened",
  Replied: "replied",
  "Meeting Booked": "meeting_booked",
  "Proposal Sent": "proposal_sent",
  Negotiation: "negotiation",
  Won: "won",
  Lost: "lost",
};

export const AGENT_CONFIG: Omit<AgentRecord, "id" | "created_at" | "updated_at">[] = [
  {
    slug: "james-carter",
    name: "James Carter",
    role: "SDR AI",
    department: "Sales",
    room: "sales",
    bio: "Lead discovery and qualification — consignors, breeders, trainers, bloodstock agents, syndicates and stud farms.",
    status: "researching",
    current_task: "Finding UK and Ireland consignors for upcoming auctions",
    last_action: "Found 24 new UK consignor leads via Tavily",
    tools: ["Tavily", "n8n", "HubSpot"],
    avatar_color: "#8B1538",
  },
  {
    slug: "emma-collins",
    name: "Emma Collins",
    role: "Lead Research AI",
    department: "Research",
    room: "research",
    bio: "Researches companies, contacts, websites, public emails, phone numbers and auction relevance.",
    status: "researching",
    current_task: "Enriching consignor dossiers for Tattersalls and Goffs",
    last_action: "Completed dossier on 12 Irish consignors",
    tools: ["Tavily", "Supabase"],
    avatar_color: "#1E3A5F",
  },
  {
    slug: "oliver-brooks",
    name: "Oliver Brooks",
    role: "HubSpot CRM Manager AI",
    department: "CRM",
    room: "crm",
    bio: "Contacts, companies, deals, notes, tasks and pipeline stages in HubSpot.",
    status: "updating_crm",
    current_task: "Updating pipeline with new consignor records",
    last_action: "Updated HubSpot pipeline with 18 new contacts",
    tools: ["HubSpot", "Supabase", "n8n"],
    avatar_color: "#FF7A59",
  },
  {
    slug: "sophia-bennett",
    name: "Sophia Bennett",
    role: "Email Marketing AI",
    department: "Marketing",
    room: "email",
    bio: "Cold emails, follow-ups, newsletters and auction campaigns — all require approval before send.",
    status: "waiting_approval",
    current_task: "Drafting personalized emails for 12 consignor leads",
    last_action: "Drafted 12 auction outreach emails pending approval",
    tools: ["Claude", "Supabase", "Gmail via n8n"],
    avatar_color: "#6B21A8",
  },
  {
    slug: "olivia-sterling",
    name: "Olivia Sterling",
    role: "Chief Copywriter AI",
    department: "Copy Intelligence",
    room: "copy",
    bio: "Reviews and improves all outbound copy before approval.",
    status: "writing",
    current_task: "Reviewing outreach copy for UK consignor batch",
    last_action: "Polished 12 email drafts for approval queue",
    tools: ["Claude", "Supabase"],
    avatar_color: "#9333EA",
  },
  {
    slug: "ethan-walker",
    name: "Ethan Walker",
    role: "Sales AI",
    department: "Sales",
    room: "sales",
    bio: "Warm replies, proposals, ROI, annual plan offers and closing.",
    status: "idle",
    current_task: "Reviewing warm leads for follow-up",
    last_action: "Flagged 3 warm leads for follow-up",
    tools: ["Claude", "HubSpot", "Calendar via n8n"],
    avatar_color: "#0D9488",
  },
  {
    slug: "isabella-morgan",
    name: "Isabella Morgan",
    role: "Customer Success AI",
    department: "Customer Success",
    room: "success",
    bio: "Onboarding, support and renewals.",
    status: "idle",
    current_task: "Monitoring onboarding queue",
    last_action: "Sent renewal reminder to 2 accounts",
    tools: ["HubSpot", "Gmail via n8n", "Supabase"],
    avatar_color: "#DB2777",
  },
  {
    slug: "victoria-green",
    name: "Victoria Green",
    role: "Partnerships AI",
    department: "Partnerships",
    room: "partnerships",
    bio: "Partnerships with stud farms, auction houses, investors, universities and equine tech.",
    status: "idle",
    current_task: "Mapping partnership targets in AU/NZ",
    last_action: "Identified 5 partnership opportunities",
    tools: ["Tavily", "HubSpot", "Supabase"],
    avatar_color: "#059669",
  },
  {
    slug: "liam-foster",
    name: "Liam Foster",
    role: "Market Intelligence AI",
    department: "Market Intelligence",
    room: "market",
    bio: "Monitors Tattersalls, Goffs, Keeneland, Fasig-Tipton, OBS, Magic Millions, Inglis, NZB and JRHA.",
    status: "monitoring",
    current_task: "Compiling Tattersalls October Sale intelligence brief",
    last_action: "Published weekly auction market digest",
    tools: ["Tavily", "Supabase"],
    avatar_color: "#CA8A04",
  },
  {
    slug: "charlotte-hughes",
    name: "Charlotte Hughes",
    role: "Social Media AI",
    department: "Social Media",
    room: "social",
    bio: "Instagram, LinkedIn, brand campaigns and content strategy.",
    status: "idle",
    current_task: "Planning auction season social calendar",
    last_action: "Scheduled 4 posts for auction week",
    tools: ["Canva", "Figma", "Supabase"],
    avatar_color: "#E11D48",
  },
  {
    slug: "noah-richardson",
    name: "Noah Richardson",
    role: "Product Manager AI",
    department: "Product",
    room: "product",
    bio: "Roadmap, features and product improvements.",
    status: "idle",
    current_task: "Reviewing Q2 roadmap priorities",
    last_action: "Updated feature spec for agent dashboard v2",
    tools: ["GitHub", "Figma", "Lovable", "Supabase"],
    avatar_color: "#4F46E5",
  },
  {
    slug: "amelia-scott",
    name: "Amelia Scott",
    role: "Operations Manager AI",
    department: "Operations",
    room: "boardroom",
    bio: "Coordinates all agents, assigns tasks and prevents duplicated work.",
    status: "completed",
    current_task: "Orchestrating UK/Ireland consignor workflow",
    last_action: "Assigned tasks across 4 agents without duplication",
    tools: ["Supabase", "n8n", "HubSpot"],
    avatar_color: "#374151",
  },
  {
    slug: "evelyn-stone",
    name: "Evelyn Stone",
    role: "CEO Dashboard AI",
    department: "Executive",
    room: "ceo",
    bio: "Executive reporting, pipeline, revenue and recommendations.",
    status: "writing",
    current_task: "Preparing daily CEO executive summary",
    last_action: "Generated morning briefing with pipeline highlights",
    tools: ["Supabase", "HubSpot"],
    avatar_color: "#7F1D1D",
  },
  {
    slug: "alexander-knight",
    name: "Alexander Knight",
    role: "CRO AI",
    department: "Revenue",
    room: "revenue",
    bio: "Revenue, conversion, annual plans and sales strategy.",
    status: "analyzing",
    current_task: "Analysing conversion rates across pipeline stages",
    last_action: "Prepared revenue forecast for Q3",
    tools: ["Supabase", "HubSpot"],
    avatar_color: "#B45309",
  },
];

export function getAgentBySlug(slug: string) {
  return AGENT_CONFIG.find((a) => a.slug === slug);
}

export function parseAgentFromCommand(command: string) {
  const lower = command.toLowerCase();
  for (const agent of AGENT_CONFIG) {
    const first = agent.name.split(" ")[0].toLowerCase();
    const last = agent.name.split(" ")[1]?.toLowerCase();
    if (lower.includes(agent.slug) || lower.includes(first) || (last && lower.includes(last))) {
      return agent;
    }
  }
  if (/find|search|consignor|lead|tavily|breeder|trainer|stud/i.test(command)) {
    return getAgentBySlug("james-carter");
  }
  if (/enrich|research|company|contact|website|email|phone/i.test(command)) {
    return getAgentBySlug("emma-collins");
  }
  if (/hubspot|crm|sync|pipeline|deal/i.test(command)) {
    return getAgentBySlug("oliver-brooks");
  }
  if (/email|draft|outreach|newsletter|campaign/i.test(command)) {
    return getAgentBySlug("sophia-bennett");
  }
  if (/copy|review|polish/i.test(command)) {
    return getAgentBySlug("olivia-sterling");
  }
  if (/proposal|close|roi|annual/i.test(command)) {
    return getAgentBySlug("ethan-walker");
  }
  if (/market|tattersalls|goffs|keeneland|auction/i.test(command)) {
    return getAgentBySlug("liam-foster");
  }
  return getAgentBySlug("amelia-scott");
}

export function toOfficialAgentRecord(
  agent: (typeof AGENT_CONFIG)[number],
  overrides?: Partial<AgentRecord>
): AgentRecord {
  return {
    id: overrides?.id || `official-${agent.slug}`,
    slug: agent.slug,
    name: agent.name,
    role: agent.role,
    department: agent.department,
    room: agent.room,
    bio: agent.bio,
    status: (overrides?.status as AgentStatus) || agent.status,
    current_task: overrides?.current_task ?? agent.current_task,
    last_action: overrides?.last_action ?? agent.last_action,
    tools: [...agent.tools],
    avatar_color: agent.avatar_color,
    created_at: overrides?.created_at || new Date().toISOString(),
    updated_at: overrides?.updated_at || new Date().toISOString(),
  };
}

export function mergeWithOfficialAgents(liveAgents: AgentRecord[]): AgentRecord[] {
  const bySlug = new Map(liveAgents.map((a) => [a.slug, a]));
  return AGENT_CONFIG.map((official) => {
    const live = bySlug.get(official.slug);
    if (!live) return toOfficialAgentRecord(official);
    return toOfficialAgentRecord(official, {
      id: live.id,
      status: live.status || official.status,
      current_task: live.current_task || official.current_task,
      last_action: live.last_action || official.last_action,
      created_at: live.created_at,
      updated_at: live.updated_at,
    });
  });
}

export const TOOL_CONNECTIONS = [
  { provider: "tavily", label: "Tavily", envKey: "TAVILY_API_KEY" },
  { provider: "hubspot", label: "HubSpot", envKey: "HUBSPOT_ACCESS_TOKEN" },
  { provider: "n8n", label: "n8n", envKey: "N8N_AGENT_WEBHOOK_URL" },
  { provider: "gmail_n8n", label: "Gmail via n8n", envKey: "N8N_AGENT_WEBHOOK_URL" },
  { provider: "calendar_n8n", label: "Google Calendar via n8n", envKey: "N8N_AGENT_WEBHOOK_URL" },
  { provider: "canva", label: "Canva", envKey: null },
  { provider: "figma", label: "Figma", envKey: null },
  { provider: "github", label: "GitHub", envKey: null },
  { provider: "lovable", label: "Lovable", envKey: null },
  { provider: "claude", label: "Claude", envKey: "ANTHROPIC_API_KEY" },
] as const;
