import { AGENTS } from "./agents";

export type WorkflowStep = {
  agentSlug: string;
  action: string;
  delay: number;
};

export const CONSIGNOR_WORKFLOW: WorkflowStep[] = [
  { agentSlug: "amelia-scott", action: "Received task: Find 50 UK and Ireland consignors", delay: 0 },
  { agentSlug: "james-carter", action: "Searching Apollo and Clay for UK/Ireland consignors", delay: 2000 },
  { agentSlug: "james-carter", action: "Found 50 consignor leads matching criteria", delay: 4000 },
  { agentSlug: "emma-collins", action: "Researching company profiles and auction participation", delay: 6000 },
  { agentSlug: "emma-collins", action: "Completed research dossiers for 50 leads", delay: 8000 },
  { agentSlug: "oliver-brooks", action: "Creating HubSpot contacts and companies", delay: 10000 },
  { agentSlug: "oliver-brooks", action: "Updated CRM pipeline with 50 new records", delay: 12000 },
  { agentSlug: "sophia-bennett", action: "Drafting personalized auction outreach emails", delay: 14000 },
  { agentSlug: "sophia-bennett", action: "Created 50 email drafts - awaiting approval", delay: 16000 },
  { agentSlug: "evelyn-stone", action: "Prepared executive summary of workflow results", delay: 18000 },
];

export function getAgentBySlug(slug: string) {
  return AGENTS.find((a) => a.slug === slug);
}

export function routeCommand(command: string): { agents: string[]; response: string } {
  const lower = command.toLowerCase();

  if (lower.includes("james") || lower.includes("consignor") || lower.includes("apollo") || lower.includes("lead")) {
    return {
      agents: ["james-carter", "emma-collins"],
      response: "James Carter is searching Apollo and Clay for consignors. Emma Collins will research profiles once leads are found. Approval will be required before any outreach.",
    };
  }
  if (lower.includes("sophia") || lower.includes("email") || lower.includes("follow-up")) {
    return {
      agents: ["sophia-bennett"],
      response: "Sophia Bennett is drafting personalized follow-up emails. All drafts will appear in the approval queue before sending.",
    };
  }
  if (lower.includes("evelyn") || lower.includes("ceo") || lower.includes("report")) {
    return {
      agents: ["evelyn-stone"],
      response: "Evelyn Stone is preparing your executive summary with pipeline metrics, revenue outlook, and recommended decisions.",
    };
  }
  if (lower.includes("oliver") || lower.includes("hubspot") || lower.includes("deal") || lower.includes("crm")) {
    return {
      agents: ["oliver-brooks"],
      response: "Oliver Brooks is querying HubSpot. Currently 8 deals in Meeting Booked stage with total pipeline value of 245,000 GBP.",
    };
  }
  if (lower.includes("victoria") || lower.includes("partnership")) {
    return {
      agents: ["victoria-green"],
      response: "Victoria Green identified 5 partnership opportunities with stud farms in Australia and New Zealand. Proposals pending your review.",
    };
  }

  return {
    agents: ["amelia-scott"],
    response: "Amelia Scott received your command and is routing tasks to the appropriate agents. No actions will execute without your approval.",
  };
}

export type AIProvider = "claude" | "openai" | "gemini" | "perplexity";

export function selectProvider(task: string): AIProvider {
  const lower = task.toLowerCase();
  if (lower.includes("write") || lower.includes("email") || lower.includes("coordinate") || lower.includes("sales")) {
    return "claude";
  }
  if (lower.includes("classify") || lower.includes("chat") || lower.includes("conversation")) {
    return "openai";
  }
  if (lower.includes("document") || lower.includes("analyze")) {
    return "gemini";
  }
  if (lower.includes("research") || lower.includes("market") || lower.includes("auction")) {
    return "perplexity";
  }
  return "claude";
}
