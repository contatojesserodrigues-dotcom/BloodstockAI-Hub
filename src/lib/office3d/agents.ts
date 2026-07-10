export type AgentPose = "walk" | "sit" | "stand" | "type" | "talk" | "coffee" | "think";

export interface AgentVisualProfile {
  slug: string;
  name: string;
  role: string;
  department: string;
  skin: string;
  hair: string;
  hairStyle: "short" | "long" | "bun" | "fade";
  outfit: string;
  pants: string;
  height: number;
  accessory?: "glasses" | "tablet" | "laptop" | "hoodie";
}

export const AGENT_PROFILES: AgentVisualProfile[] = [
  { slug: "james-carter", name: "James Carter", role: "SDR", department: "sales", skin: "#D4A574", hair: "#2C1810", hairStyle: "short", outfit: "#1E40AF", pants: "#0F172A", height: 1.02, accessory: "tablet" },
  { slug: "emma-collins", name: "Emma Collins", role: "Research", department: "research", skin: "#F5D0A9", hair: "#5C3D2E", hairStyle: "long", outfit: "#F8FAFC", pants: "#0F172A", height: 0.96, accessory: "glasses" },
  { slug: "oliver-brooks", name: "Oliver Brooks", role: "CRM", department: "engineering", skin: "#C68642", hair: "#1F2937", hairStyle: "fade", outfit: "#334155", pants: "#111827", height: 1.04, accessory: "hoodie" },
  { slug: "sophia-bennett", name: "Sophia Bennett", role: "Marketing", department: "marketing", skin: "#FDDBB4", hair: "#4A044E", hairStyle: "long", outfit: "#6B21A8", pants: "#312E81", height: 0.98, accessory: "laptop" },
  { slug: "olivia-sterling", name: "Olivia Sterling", role: "Copywriter", department: "marketing", skin: "#FFE4C4", hair: "#78350F", hairStyle: "bun", outfit: "#9333EA", pants: "#4C1D95", height: 1.0, accessory: "laptop" },
  { slug: "ethan-walker", name: "Ethan Walker", role: "Sales", department: "sales", skin: "#B87A4A", hair: "#292524", hairStyle: "short", outfit: "#1D4ED8", pants: "#1E293B", height: 1.06, accessory: "tablet" },
  { slug: "isabella-morgan", name: "Isabella Morgan", role: "Success", department: "support", skin: "#F9D5BB", hair: "#881337", hairStyle: "long", outfit: "#DB2777", pants: "#831843", height: 0.97 },
  { slug: "victoria-green", name: "Victoria Green", role: "Partnerships", department: "sales", skin: "#E8B88A", hair: "#14532D", hairStyle: "long", outfit: "#059669", pants: "#064E3B", height: 1.01 },
  { slug: "liam-foster", name: "Liam Foster", role: "Market Intel", department: "research", skin: "#D4A574", hair: "#713F12", hairStyle: "short", outfit: "#CA8A04", pants: "#422006", height: 1.03, accessory: "glasses" },
  { slug: "charlotte-hughes", name: "Charlotte Hughes", role: "Social", department: "marketing", skin: "#FFE0BD", hair: "#9F1239", hairStyle: "bun", outfit: "#E11D48", pants: "#881337", height: 0.95, accessory: "laptop" },
  { slug: "noah-richardson", name: "Noah Richardson", role: "Product", department: "engineering", skin: "#C68642", hair: "#1E1B4B", hairStyle: "fade", outfit: "#4F46E5", pants: "#1E1B4B", height: 1.05, accessory: "hoodie" },
  { slug: "amelia-scott", name: "Amelia Scott", role: "Operations", department: "operations", skin: "#FDDBB4", hair: "#374151", hairStyle: "bun", outfit: "#475569", pants: "#1E293B", height: 1.0 },
  { slug: "evelyn-stone", name: "Evelyn Stone", role: "CEO", department: "ceo", skin: "#F5D0A9", hair: "#450A0A", hairStyle: "long", outfit: "#7F1D1D", pants: "#450A0A", height: 1.07 },
  { slug: "alexander-knight", name: "Alexander Knight", role: "CRO", department: "ceo", skin: "#B87A4A", hair: "#1C1917", hairStyle: "short", outfit: "#B45309", pants: "#292524", height: 1.08, accessory: "tablet" },
];

export function getAgentProfile(slug: string): AgentVisualProfile {
  return AGENT_PROFILES.find((a) => a.slug === slug) || AGENT_PROFILES[0];
}

const STATUS_POSE: Record<string, AgentPose> = {
  RESEARCHING: "type",
  MONITORING: "think",
  UPDATING_CRM: "type",
  WAITING_APPROVAL: "stand",
  WRITING: "type",
  ANALYZING: "think",
  COMPLETED: "talk",
  SENDING_APPROVED: "walk",
  IDLE: "coffee",
};

export function poseForStatus(status: string): AgentPose {
  return STATUS_POSE[status.toUpperCase().replace(/-/g, "_")] || "walk";
}

export function bubbleForTask(status: string, task: string, name: string) {
  if (task?.trim()) return task;
  const key = status.toUpperCase().replace(/-/g, "_");
  const defaults: Record<string, string> = {
    RESEARCHING: "Searching Tavily...",
    MONITORING: "Monitoring markets...",
    UPDATING_CRM: "Updating HubSpot...",
    WAITING_APPROVAL: "Waiting CEO approval...",
    WRITING: "Writing report...",
    ANALYZING: "Running Anthropic analysis...",
    COMPLETED: "Task completed.",
    IDLE: `${name} is available.`,
  };
  return defaults[key] || "Executing workflow...";
}
