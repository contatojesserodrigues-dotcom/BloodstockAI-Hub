import { AGENT_CONFIG } from "../src/lib/agents/agent-config.ts";

export const SEED_AGENTS = AGENT_CONFIG.map((agent) => ({
  slug: agent.slug,
  name: agent.name,
  role: agent.role,
  room: agent.room || agent.department,
  bio: agent.bio,
  status: agent.status.toUpperCase().replace(/-/g, "_"),
  currentTask: agent.current_task,
  lastAction: agent.last_action,
  tools: agent.tools,
  avatarColor: agent.avatar_color,
}));

export const SEED_INTEGRATIONS = [
  { id: "n8n", label: "n8n Automation", connected: true },
  { id: "claude", label: "Claude API" },
  { id: "tavily", label: "Tavily" },
  { id: "hubspot", label: "HubSpot" },
  { id: "supabase", label: "Supabase" },
];
