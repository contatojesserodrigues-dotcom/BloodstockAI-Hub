/** Full Kuiper AI Employees Marketplace catalog */

export type CatalogDepartment = {
  id: string;
  name: string;
  emoji: string;
  marketplace: string;
};

export type CatalogAgent = {
  id: string;
  name: string;
  role: string;
  departmentId: string;
  description: string;
  functions: string[];
};

export const CATALOG_DEPARTMENTS: CatalogDepartment[] = [
  { id: "executive", name: "CEO / Strategy / Management", emoji: "🏢", marketplace: "Executive Agents" },
  { id: "hr", name: "Human Resources (HR)", emoji: "👥", marketplace: "HR Agents" },
  { id: "finance", name: "Finance", emoji: "💰", marketplace: "Finance Agents" },
  { id: "marketing", name: "Marketing", emoji: "📢", marketplace: "Marketing Agents" },
  { id: "social", name: "Social Media", emoji: "📱", marketplace: "Social Media Agents" },
  { id: "sales", name: "Sales", emoji: "💼", marketplace: "Sales Agents" },
  { id: "support", name: "Customer Service", emoji: "🤝", marketplace: "Sales Agents" },
  { id: "admin", name: "Administrative", emoji: "📄", marketplace: "Executive Agents" },
  { id: "legal", name: "Legal", emoji: "⚖️", marketplace: "Legal Agents" },
  { id: "research", name: "Research & Intelligence", emoji: "🔍", marketplace: "Data Agents" },
  { id: "operations", name: "Operations", emoji: "🚚", marketplace: "Industry Agents" },
  { id: "export", name: "International / Export", emoji: "🌎", marketplace: "Industry Agents" },
  { id: "tech", name: "Technology", emoji: "💻", marketplace: "Technology Agents" },
  { id: "data", name: "Data & AI", emoji: "📊", marketplace: "Data Agents" },
  { id: "production", name: "Industry / Production", emoji: "🏭", marketplace: "Industry Agents" },
  { id: "vertical", name: "Industry Specialists", emoji: "🏥", marketplace: "Industry Agents" },
  { id: "personal", name: "Personal Assistants", emoji: "🤖", marketplace: "Personal Assistants" },
];

export const CATALOG_AGENTS: CatalogAgent[] = [
  // Executive
  { id: "ceo-ai", name: "CEO AI Agent", role: "Chief Executive Officer", departmentId: "executive", description: "Executive assistant for the founder or CEO.", functions: ["Analyzes company KPIs", "Summarizes key decisions", "Creates strategic plans", "Monitors opportunities and risks"] },
  { id: "executive-assistant", name: "Executive Assistant AI Agent", role: "Digital Executive Secretary", departmentId: "executive", description: "Digital executive secretary.", functions: ["Organizes calendar", "Schedules meetings", "Manages email", "Prepares documents and presentations"] },
  { id: "strategy-ai", name: "Strategy AI Agent", role: "Strategic Consultant", departmentId: "executive", description: "Strategic consultant.", functions: ["Market analysis", "Competitor studies", "Growth plans", "New opportunity suggestions"] },
  { id: "business-analyst", name: "Business Analyst AI Agent", role: "Business Analyst", departmentId: "executive", description: "Business analyst.", functions: ["Data analysis", "Report creation", "Problem identification", "Operational improvements"] },
  // HR
  { id: "hr-manager", name: "HR Manager AI Agent", role: "HR Manager", departmentId: "hr", description: "Human resources manager.", functions: ["Hiring processes", "Employee organization", "Internal policies", "Document management"] },
  { id: "recruitment", name: "Recruitment AI Agent", role: "Digital Recruiter", departmentId: "hr", description: "Digital recruiter.", functions: ["Posts jobs", "Analyzes resumes", "Ranks candidates", "Schedules interviews"] },
  { id: "onboarding", name: "Employee Onboarding AI Agent", role: "Onboarding Specialist", departmentId: "hr", description: "Integrates new employees.", functions: ["Creates training", "Sends documents", "Explains internal processes"] },
  { id: "training-dev", name: "Training & Development AI Agent", role: "L&D Specialist", departmentId: "hr", description: "People development.", functions: ["Creates internal courses", "Assesses competencies", "Suggests training"] },
  // Finance
  { id: "cfo-ai", name: "CFO AI Agent", role: "Chief Financial Officer", departmentId: "finance", description: "Digital CFO.", functions: ["Financial health analysis", "Forecasts", "Supports financial decisions"] },
  { id: "accounting", name: "Accounting AI Agent", role: "Digital Accountant", departmentId: "finance", description: "Digital accountant.", functions: ["Organizes tax documents", "Categorizes expenses", "Accounting reports"] },
  { id: "accounts-payable", name: "Accounts Payable AI Agent", role: "Accounts Payable", departmentId: "finance", description: "Accounts payable.", functions: ["Supplier control", "Due date organization", "Payment reminders"] },
  { id: "accounts-receivable", name: "Accounts Receivable AI Agent", role: "Accounts Receivable", departmentId: "finance", description: "Accounts receivable.", functions: ["Payment monitoring", "Collections", "Delinquency analysis"] },
  { id: "financial-analyst", name: "Financial Analyst AI Agent", role: "Financial Analyst", departmentId: "finance", description: "Financial analyst.", functions: ["Dashboards", "Cost analysis", "Projections"] },
  // Marketing
  { id: "cmo-ai", name: "CMO AI Agent", role: "Chief Marketing Officer", departmentId: "marketing", description: "Marketing director.", functions: ["Defines strategies", "Campaign analysis", "Growth planning"] },
  { id: "marketing-manager", name: "Marketing Manager AI Agent", role: "Marketing Manager", departmentId: "marketing", description: "Marketing manager.", functions: ["Coordinates campaigns", "Organizes calendar", "Measures results"] },
  { id: "content-writer", name: "Content Writer AI Agent", role: "Content Writer", departmentId: "marketing", description: "Writer.", functions: ["Blogs", "Emails", "Articles", "Commercial copy"] },
  { id: "copywriter", name: "Copywriter AI Agent", role: "Persuasion Specialist", departmentId: "marketing", description: "Persuasion specialist.", functions: ["Ads", "Landing pages", "Headlines", "Scripts"] },
  { id: "seo-specialist", name: "SEO Specialist AI Agent", role: "SEO Specialist", departmentId: "marketing", description: "Search specialist.", functions: ["Keyword research", "Site optimization", "SEO strategy"] },
  { id: "brand-manager", name: "Brand Manager AI Agent", role: "Brand Manager", departmentId: "marketing", description: "Brand manager.", functions: ["Brand identity", "Positioning", "Guidelines"] },
  // Social
  { id: "social-manager", name: "Social Media Manager AI Agent", role: "Social Media Manager", departmentId: "social", description: "Manages social networks.", functions: ["Plans posts", "Creates calendar", "Analyzes metrics"] },
  { id: "instagram-ai", name: "Instagram AI Agent", role: "Instagram Specialist", departmentId: "social", description: "Instagram specialist.", functions: ["Creates posts", "Captions", "Growth strategies"] },
  { id: "linkedin-ai", name: "LinkedIn AI Agent", role: "B2B Marketing", departmentId: "social", description: "B2B marketing.", functions: ["Professional content", "Company prospecting", "Authority building"] },
  { id: "community-manager", name: "Community Manager AI Agent", role: "Community Manager", departmentId: "social", description: "Online relationship.", functions: ["Replies to comments", "Manages community", "Reputation monitoring"] },
  // Sales
  { id: "cro-ai", name: "CRO AI Agent", role: "Chief Revenue Officer", departmentId: "sales", description: "Commercial director.", functions: ["Revenue strategy", "Sales analysis", "Growth optimization"] },
  { id: "sales-manager", name: "Sales Manager AI Agent", role: "Sales Manager", departmentId: "sales", description: "Sales manager.", functions: ["Team tracking", "Goal setting", "Performance analysis"] },
  { id: "lead-generation", name: "Lead Generation AI Agent", role: "Lead Generation", departmentId: "sales", description: "Lead generation.", functions: ["Finds customers", "Builds lists", "Market research"] },
  { id: "sdr-ai", name: "SDR AI Agent", role: "Sales Development", departmentId: "sales", description: "Pre-sales.", functions: ["Sends messages", "Qualifies leads", "Books meetings"] },
  { id: "sales-rep", name: "Sales Representative AI Agent", role: "Digital Sales Rep", departmentId: "sales", description: "Digital salesperson.", functions: ["Talks to customers", "Presents products", "Follow-up"] },
  { id: "customer-success", name: "Customer Success AI Agent", role: "Customer Success", departmentId: "sales", description: "Customer success.", functions: ["Customer tracking", "Reduces churn", "Creates reports"] },
  // Support
  { id: "customer-support", name: "Customer Support AI Agent", role: "Automated Support", departmentId: "support", description: "Automated support.", functions: ["Answers questions", "Resolves issues", "Routes tickets"] },
  { id: "cs-manager", name: "Customer Service Manager AI Agent", role: "Support Manager", departmentId: "support", description: "Support management.", functions: ["Analyzes complaints", "Improves processes"] },
  // Admin
  { id: "admin-assistant", name: "Administrative Assistant AI Agent", role: "Admin Assistant", departmentId: "admin", description: "Administrative assistant.", functions: ["Documents", "Organization", "Internal routines"] },
  { id: "document-mgmt", name: "Document Management AI Agent", role: "Document Manager", departmentId: "admin", description: "Document management.", functions: ["Organizes files", "Searches documents", "Classifies information"] },
  { id: "meeting-assistant", name: "Meeting Assistant AI Agent", role: "Meeting Assistant", departmentId: "admin", description: "Meeting assistant.", functions: ["Transcribes meetings", "Creates minutes", "Lists tasks"] },
  // Legal
  { id: "legal-assistant", name: "Legal Assistant AI Agent", role: "Legal Assistant", departmentId: "legal", description: "Legal assistant.", functions: ["Legal research", "Contract analysis", "Document organization"] },
  { id: "contract-review", name: "Contract Review AI Agent", role: "Contract Analyst", departmentId: "legal", description: "Contract analyst.", functions: ["Identifies risks", "Compares clauses", "Summarizes contracts"] },
  // Research
  { id: "market-research", name: "Market Research AI Agent", role: "Market Researcher", departmentId: "research", description: "Market researcher.", functions: ["Trend analysis", "Competitor studies", "Reports"] },
  { id: "competitor-intel", name: "Competitor Intelligence AI Agent", role: "Competitive Analyst", departmentId: "research", description: "Competitive analyst.", functions: ["Monitors competitors", "Identifies opportunities"] },
  // Operations
  { id: "ops-manager", name: "Operations Manager AI Agent", role: "Operations Director", departmentId: "operations", description: "Operations director.", functions: ["Process improvement", "Efficiency control"] },
  { id: "supply-chain", name: "Supply Chain AI Agent", role: "Supply Chain", departmentId: "operations", description: "Supply chain.", functions: ["Supplier analysis", "Logistics monitoring"] },
  { id: "procurement", name: "Procurement AI Agent", role: "Procurement", departmentId: "operations", description: "Purchasing.", functions: ["Supplier research", "Price negotiation", "Proposal comparison"] },
  // Export
  { id: "export-manager", name: "Export Manager AI Agent", role: "Export Manager", departmentId: "export", description: "Export manager.", functions: ["Documentation", "International rules", "Customs processes"] },
  { id: "compliance", name: "Compliance AI Agent", role: "Regulatory Control", departmentId: "export", description: "Regulatory control.", functions: ["Checks norms", "Risk analysis"] },
  // Tech
  { id: "cto-ai", name: "CTO AI Agent", role: "Chief Technology Officer", departmentId: "tech", description: "Technology director.", functions: ["Tech strategy", "Architecture", "Innovation"] },
  { id: "software-dev", name: "Software Developer AI Agent", role: "Software Developer", departmentId: "tech", description: "Developer.", functions: ["Writes code", "Fixes bugs", "Builds systems"] },
  { id: "devops", name: "DevOps AI Agent", role: "DevOps", departmentId: "tech", description: "Infrastructure.", functions: ["Deploy", "Monitoring", "Security"] },
  { id: "cybersecurity", name: "Cybersecurity AI Agent", role: "Cybersecurity", departmentId: "tech", description: "Digital security.", functions: ["Vulnerability analysis", "Threat monitoring"] },
  // Data
  { id: "data-analyst", name: "Data Analyst AI Agent", role: "Data Analyst", departmentId: "data", description: "Data analyst.", functions: ["Dashboards", "Insights", "Reports"] },
  { id: "data-scientist", name: "Data Scientist AI Agent", role: "Data Scientist", departmentId: "data", description: "Data scientist.", functions: ["Predictive models", "Machine learning"] },
  { id: "ai-engineer", name: "AI Engineer AI Agent", role: "AI Engineer", departmentId: "data", description: "AI engineer.", functions: ["Builds AI systems", "Optimizes models"] },
  // Production
  { id: "production-manager", name: "Production Manager AI Agent", role: "Production Manager", departmentId: "production", description: "Production manager.", functions: ["Planning", "Operational efficiency"] },
  { id: "quality-control", name: "Quality Control AI Agent", role: "Quality Control", departmentId: "production", description: "Quality control.", functions: ["Analyzes standards", "Detects issues"] },
  // Vertical
  { id: "real-estate", name: "Real Estate AI Agent", role: "Real Estate Specialist", departmentId: "vertical", description: "Real estate specialist.", functions: ["Property analysis", "Market", "Investments"] },
  { id: "agriculture", name: "Agriculture AI Agent", role: "Agriculture Specialist", departmentId: "vertical", description: "Agriculture specialist.", functions: ["Climate analysis", "Production", "Ag market"] },
  { id: "equine-bloodstock", name: "Equine / Bloodstock AI Agent", role: "Bloodstock Specialist", departmentId: "vertical", description: "Bloodstock specialist.", functions: ["Pedigree analysis", "Performance", "Horse market"] },
  { id: "hospitality", name: "Hospitality AI Agent", role: "Hospitality Specialist", departmentId: "vertical", description: "Hospitality specialist.", functions: ["Reservations", "Service", "Guest experience"] },
  { id: "travel", name: "Travel AI Agent", role: "Travel Specialist", departmentId: "vertical", description: "Travel specialist.", functions: ["Planning", "Bookings", "Research"] },
  // Personal
  { id: "personal-ea", name: "Personal Executive Assistant AI Agent", role: "Personal EA", departmentId: "personal", description: "Full personal assistant.", functions: ["Calendar", "Email", "Research", "Organization"] },
  { id: "personal-finance", name: "Personal Finance AI Agent", role: "Personal Finance", departmentId: "personal", description: "Personal finance.", functions: ["Budget control", "Investments", "Planning"] },
  { id: "personal-learning", name: "Personal Learning AI Agent", role: "Learning Coach", departmentId: "personal", description: "Learning coach.", functions: ["Studies", "Courses", "Learning organization"] },
];

export const MARKETPLACE_CATEGORIES = [
  "Executive Agents",
  "Finance Agents",
  "Marketing Agents",
  "Social Media Agents",
  "Sales Agents",
  "HR Agents",
  "Legal Agents",
  "Technology Agents",
  "Data Agents",
  "Industry Agents",
  "Personal Assistants",
] as const;

export function agentsByDepartment(departmentId: string) {
  return CATALOG_AGENTS.filter((a) => a.departmentId === departmentId);
}

export function getCatalogAgent(id: string) {
  return CATALOG_AGENTS.find((a) => a.id === id);
}
