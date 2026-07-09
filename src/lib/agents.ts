import { AGENT_CONFIG } from "@/lib/agents/agent-config";

export const ROOMS = [
  { id: "sales", name: "Sales Office", icon: "TrendingUp", agents: ["james-carter", "ethan-walker"] },
  { id: "research", name: "Lead Research Room", icon: "Search", agents: ["emma-collins"] },
  { id: "crm", name: "CRM Room", icon: "Database", agents: ["oliver-brooks"] },
  { id: "email", name: "Email Marketing Room", icon: "Mail", agents: ["sophia-bennett"] },
  { id: "copy", name: "Copy Intelligence Room", icon: "PenLine", agents: ["olivia-sterling"] },
  { id: "success", name: "Customer Success Room", icon: "Heart", agents: ["isabella-morgan"] },
  { id: "partnerships", name: "Partnerships Room", icon: "Handshake", agents: ["victoria-green"] },
  { id: "market", name: "Market Intelligence Room", icon: "BarChart3", agents: ["liam-foster"] },
  { id: "social", name: "Social Media Room", icon: "Share2", agents: ["charlotte-hughes"] },
  { id: "product", name: "Product Room", icon: "Layers", agents: ["noah-richardson"] },
  { id: "boardroom", name: "Executive Boardroom", icon: "Users", agents: ["amelia-scott"] },
  { id: "ceo", name: "CEO Dashboard Room", icon: "Crown", agents: ["evelyn-stone"] },
  { id: "revenue", name: "Revenue Office", icon: "DollarSign", agents: ["alexander-knight"] },
] as const;

function toUiStatus(status: string) {
  return status.toUpperCase().replace(/-/g, "_");
}

export const AGENTS = AGENT_CONFIG.map((agent) => ({
  slug: agent.slug,
  name: agent.name,
  role: agent.role,
  title: agent.role,
  room: agent.room || agent.department,
  bio: agent.bio || "",
  tools: agent.tools,
  status: toUiStatus(agent.status),
  currentTask: agent.current_task || "Standing by",
  lastAction: agent.last_action || "Ready",
  avatarColor: agent.avatar_color || "#8B1538",
})) as readonly {
  slug: string;
  name: string;
  role: string;
  title: string;
  room: string;
  bio: string;
  tools: readonly string[];
  status: string;
  currentTask: string;
  lastAction: string;
  avatarColor: string;
}[];

export type Agent = (typeof AGENTS)[number];

const agentBySlug = new Map<string, Agent>(AGENTS.map((agent) => [agent.slug, agent]));

export function getAgent(slug: string): Agent | undefined {
  return agentBySlug.get(slug);
}

export const officeRooms = ROOMS.map((room) => ({
  room,
  agents: AGENTS.filter((agent) => (room.agents as readonly string[]).includes(agent.slug)),
}));
