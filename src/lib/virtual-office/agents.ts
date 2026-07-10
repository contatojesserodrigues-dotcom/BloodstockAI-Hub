export type AgentPose = "walk" | "sit" | "type" | "stand" | "talk" | "coffee" | "meeting";

export interface AgentVisual {
  slug: string;
  skin: string;
  hair: string;
  suit: string;
  shirt: string;
  height: number;
}

export const AGENT_VISUALS: Record<string, AgentVisual> = {
  "james-carter": { slug: "james-carter", skin: "#C9A882", hair: "#2A2018", suit: "#2C4A6E", shirt: "#E8EDF2", height: 1.04 },
  "emma-collins": { slug: "emma-collins", skin: "#E8C9A8", hair: "#4A3828", suit: "#3D4F63", shirt: "#F4F7FA", height: 0.98 },
  "oliver-brooks": { slug: "oliver-brooks", skin: "#B89060", hair: "#1A1A1A", suit: "#2A3038", shirt: "#6B7280", height: 1.02 },
  "sophia-bennett": { slug: "sophia-bennett", skin: "#F0D4B8", hair: "#3A2848", suit: "#4A3D5C", shirt: "#EDE9F4", height: 0.97 },
  "olivia-sterling": { slug: "olivia-sterling", skin: "#EDD5B8", hair: "#5C4030", suit: "#453550", shirt: "#FAF8FC", height: 1.0 },
  "ethan-walker": { slug: "ethan-walker", skin: "#C4A078", hair: "#252525", suit: "#2E4A68", shirt: "#E2E8F0", height: 1.05 },
  "isabella-morgan": { slug: "isabella-morgan", skin: "#F2D8BC", hair: "#5A2838", suit: "#4A3548", shirt: "#F8F4F8", height: 0.96 },
  "victoria-green": { slug: "victoria-green", skin: "#D8B898", hair: "#1E3828", suit: "#2E4A40", shirt: "#E8F0EC", height: 1.01 },
  "liam-foster": { slug: "liam-foster", skin: "#C8A880", hair: "#4A3820", suit: "#4A4430", shirt: "#F0EDE4", height: 1.03 },
  "charlotte-hughes": { slug: "charlotte-hughes", skin: "#F0D8C0", hair: "#6A3040", suit: "#4A3540", shirt: "#F8F0F2", height: 0.95 },
  "noah-richardson": { slug: "noah-richardson", skin: "#B89068", hair: "#1E1E30", suit: "#2A2E48", shirt: "#7B8298", height: 1.04 },
  "amelia-scott": { slug: "amelia-scott", skin: "#EDD0B0", hair: "#3A3A40", suit: "#3A4048", shirt: "#D8DCE4", height: 1.0 },
  "evelyn-stone": { slug: "evelyn-stone", skin: "#E8C8A8", hair: "#3A2020", suit: "#3A2830", shirt: "#F0E8EC", height: 1.06 },
  "alexander-knight": { slug: "alexander-knight", skin: "#C0A078", hair: "#1C1C1C", suit: "#4A3C28", shirt: "#E8E0D4", height: 1.07 },
};

export function poseFromStatus(status: string): AgentPose {
  const s = status.toUpperCase().replace(/-/g, "_");
  const map: Record<string, AgentPose> = {
    RESEARCHING: "type",
    MONITORING: "stand",
    UPDATING_CRM: "type",
    WAITING_APPROVAL: "stand",
    WRITING: "type",
    ANALYZING: "type",
    COMPLETED: "talk",
    SENDING_APPROVED: "walk",
    IDLE: "coffee",
  };
  return map[s] || "walk";
}

export function bubbleText(task: string, status: string): string {
  if (task?.trim()) return task;
  const s = status.toUpperCase().replace(/-/g, "_");
  const defaults: Record<string, string> = {
    RESEARCHING: "Searching Tavily...",
    UPDATING_CRM: "Syncing HubSpot...",
    WAITING_APPROVAL: "Waiting approval...",
    WRITING: "Running Claude...",
    ANALYZING: "Analyzing pipeline...",
    COMPLETED: "Handoff to next agent...",
    IDLE: "Available",
  };
  return defaults[s] || "Processing...";
}

export function getVisual(slug: string): AgentVisual {
  return AGENT_VISUALS[slug] || AGENT_VISUALS["amelia-scott"];
}
