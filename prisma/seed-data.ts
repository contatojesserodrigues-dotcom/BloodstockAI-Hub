export const SEED_AGENTS = [
  { slug: "james-carter", name: "James Carter", role: "Senior Sales Development Representative", room: "sales", bio: "Apollo, Clay, lead generation", status: "RESEARCHING" as const, currentTask: "Finding UK and Ireland consignors", lastAction: "Found 24 new UK consignor leads from Apollo", tools: ["Apollo", "Clay", "HubSpot"], avatarColor: "#8B1538" },
  { slug: "emma-collins", name: "Emma Collins", role: "Senior Market Intelligence Analyst", room: "research", bio: "Lead research and dossiers", status: "RESEARCHING" as const, currentTask: "Researching Highclere Thoroughbred Racing", lastAction: "Completed dossier on 12 Irish consignors", tools: ["Apollo", "Clay"], avatarColor: "#1E3A5F" },
  { slug: "oliver-brooks", name: "Oliver Brooks", role: "HubSpot CRM Manager", room: "crm", bio: "HubSpot CRM management", status: "UPDATING_CRM" as const, currentTask: "Updating pipeline", lastAction: "Updated HubSpot pipeline", tools: ["HubSpot"], avatarColor: "#FF7A59" },
  { slug: "sophia-bennett", name: "Sophia Bennett", role: "Personalized Outreach Specialist", room: "email", bio: "Email campaigns and outreach", status: "WAITING_APPROVAL" as const, currentTask: "Drafting emails for 12 leads", lastAction: "Drafted 12 emails pending approval", tools: ["Gmail", "HubSpot"], avatarColor: "#6B21A8" },
  { slug: "ethan-walker", name: "Ethan Walker", role: "Senior Sales Consultant", room: "sales", bio: "Sales and closing", status: "IDLE" as const, currentTask: "Reviewing warm leads", lastAction: "Flagged 3 warm leads", tools: ["HubSpot"], avatarColor: "#0D9488" },
  { slug: "isabella-morgan", name: "Isabella Morgan", role: "Customer Success Manager", room: "success", bio: "Customer success", status: "IDLE" as const, currentTask: "Monitoring onboarding", lastAction: "Sent renewal reminders", tools: ["HubSpot"], avatarColor: "#DB2777" },
  { slug: "victoria-green", name: "Victoria Green", role: "Strategic Partnerships Manager", room: "partnerships", bio: "Partnerships", status: "WRITING" as const, currentTask: "AU stud farm proposal", lastAction: "Identified 5 AU partnerships", tools: ["HubSpot"], avatarColor: "#059669" },
  { slug: "liam-foster", name: "Liam Foster", role: "Thoroughbred Market Analyst", room: "market", bio: "Auction market intelligence", status: "RESEARCHING" as const, currentTask: "Tattersalls brief", lastAction: "Published market digest", tools: ["Perplexity"], avatarColor: "#CA8A04" },
  { slug: "charlotte-hughes", name: "Charlotte Hughes", role: "Digital Marketing Manager", room: "social", bio: "Social media", status: "WRITING" as const, currentTask: "LinkedIn campaign", lastAction: "Scheduled 4 posts", tools: ["Canva"], avatarColor: "#E11D48" },
  { slug: "noah-richardson", name: "Noah Richardson", role: "Product Strategy Manager", room: "product", bio: "Product roadmap", status: "IDLE" as const, currentTask: "Q2 roadmap review", lastAction: "Updated feature spec", tools: ["Figma", "GitHub"], avatarColor: "#4F46E5" },
  { slug: "amelia-scott", name: "Amelia Scott", role: "AI Operations Director", room: "boardroom", bio: "Agent coordination", status: "COMPLETED" as const, currentTask: "Orchestrating workflow", lastAction: "Assigned tasks across agents", tools: ["Claude"], avatarColor: "#374151" },
  { slug: "evelyn-stone", name: "Evelyn Stone", role: "Chief Executive Intelligence", room: "ceo", bio: "Executive reporting", status: "WRITING" as const, currentTask: "Daily CEO summary", lastAction: "Generated morning briefing", tools: ["Claude", "HubSpot"], avatarColor: "#7F1D1D" },
];

export const SEED_INTEGRATIONS = [
  { id: "n8n", label: "n8n Automation", connected: true },
  { id: "claude", label: "Claude API" },
  { id: "openai", label: "OpenAI API" },
  { id: "gemini", label: "Gemini API" },
  { id: "hubspot", label: "HubSpot" },
  { id: "apollo", label: "Apollo" },
  { id: "clay", label: "Clay" },
];
