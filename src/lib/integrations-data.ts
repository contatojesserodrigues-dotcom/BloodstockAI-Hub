export const INTEGRATIONS = [
  { id: "claude", label: "Claude API", category: "AI", envKey: "ANTHROPIC_API_KEY" },
  { id: "tavily", label: "Tavily API", category: "Research", envKey: "TAVILY_API_KEY" },
  { id: "supabase", label: "Supabase", category: "Database", envKey: "SUPABASE_SERVICE_ROLE_KEY" },
  { id: "hubspot", label: "HubSpot", category: "CRM", envKey: "HUBSPOT_ACCESS_TOKEN" },
  { id: "n8n", label: "n8n Automation", category: "Automation", envKey: "N8N_AGENT_WEBHOOK_URL", url: "https://bloodstockai.app.n8n.cloud" },
  { id: "gmail", label: "Gmail via n8n", category: "Google", envKey: "N8N_AGENT_WEBHOOK_URL" },
  { id: "calendar", label: "Google Calendar via n8n", category: "Google", envKey: "N8N_AGENT_WEBHOOK_URL" },
  { id: "figma", label: "Figma API", category: "Design", envKey: "FIGMA_API_KEY" },
  { id: "github", label: "GitHub API", category: "Dev", envKey: "GITHUB_API_KEY" },
  { id: "canva", label: "Canva", category: "Design", envKey: null },
  { id: "lovable", label: "Lovable", category: "Product", envKey: null },
] as const;
