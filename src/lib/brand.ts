export const BRAND = {
  name: "Kuiper Agents Hub Center",
  shortName: "Kuiper",
  tagline: "Create your AI workforce in minutes.",
  company: "Atom AI Works",
  footer: "Kuiper Agents Hub Center — A project by Atom AI Works",
  website: "www.atomaiworks.com",
  email: "hello@atomaiworks.com",
  logo: "/kuiper-logo.png",
  logoLg: "/kuiper-logo-lg.png",
  url: "https://kuiper-ai-hub.vercel.app",
  accent: "#6A0DAD",
  accentLight: "#B794F4",
  magenta: "#E600A0",
} as const;

export const INDUSTRIES = [
  "Agriculture",
  "Bloodstock / Equine",
  "Finance",
  "Marketing",
  "Sales",
  "Real Estate",
  "Technology",
  "Healthcare",
  "Legal",
  "Manufacturing",
  "Logistics",
  "Education",
  "Other",
] as const;

export const AGENT_DEPARTMENTS = [
  {
    id: "administrative",
    name: "Administrative Agents",
    description: "Email, calendar, documents, reports, and meeting summaries.",
    capabilities: ["Email management", "Calendar management", "Document organization", "Reports", "Meeting summaries"],
  },
  {
    id: "marketing",
    name: "Marketing Agents",
    description: "Content, SEO, campaigns, and competitor research.",
    capabilities: ["Content creation", "SEO", "Campaign planning", "Market analysis", "Competitor research"],
  },
  {
    id: "social",
    name: "Social Media Agents",
    description: "Content calendars and community management across platforms.",
    capabilities: ["Content calendar", "Post generation", "Analytics", "Community management"],
    integrations: ["Instagram", "Facebook", "LinkedIn", "TikTok"],
  },
  {
    id: "sales",
    name: "Sales Agents",
    description: "Lead generation, prospecting, qualification, and follow-ups.",
    capabilities: ["Lead generation", "Prospecting", "Lead qualification", "Follow-up automation"],
    integrations: ["HubSpot", "Apollo.io", "Clay"],
  },
  {
    id: "finance",
    name: "Finance Agents",
    description: "Reports, cash flow, forecasting, and expense monitoring.",
    capabilities: ["Financial reports", "Cash flow analysis", "Forecasting", "Expense monitoring"],
  },
  {
    id: "research",
    name: "Research Intelligence Agents",
    description: "Market research, competitor intelligence, and industry reports.",
    capabilities: ["Market research", "Competitor intelligence", "Industry reports"],
    integrations: ["Perplexity", "Search APIs", "Data sources"],
  },
  {
    id: "custom",
    name: "Custom AI Agent",
    description: "Describe what you need and we generate a tailored agent.",
    capabilities: ["Custom configuration"],
  },
] as const;
