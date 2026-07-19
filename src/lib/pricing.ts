/** Kuiper Agents Hub Center pricing */

export const AGENT_MONTHLY_USD = 12;

/** One-time systems integration setup fee */
export const INTEGRATION_SETUP_FEE_USD = 800;

/**
 * Premium support + monitoring (monthly).
 * Basic support is already included in the per-agent monthly fee.
 */
export const PREMIUM_SUPPORT_MONTHLY_USD = 350;

/** Legacy per-integration fees (optional add-ons after setup). */
export const INTEGRATION_FEES_USD: Record<string, number> = {
  hubspot: 29,
  salesforce: 39,
  apollo: 19,
  clay: 19,
  gmail: 9,
  gcal: 9,
  gdrive: 9,
  outlook: 12,
  teams: 12,
  meta: 25,
  "google-ads": 25,
  linkedin: 19,
  n8n: 15,
  tavily: 10,
  perplexity: 10,
  openai: 0,
  claude: 0,
  grok: 0,
  supabase: 0,
};

export const DEFAULT_INTEGRATION_FEE_USD = 15;

export function integrationFee(providerId: string): number {
  return INTEGRATION_FEES_USD[providerId] ?? DEFAULT_INTEGRATION_FEE_USD;
}

export function agentsMonthlyTotal(agentCount: number): number {
  return agentCount * AGENT_MONTHLY_USD;
}

export function estimateSignupQuote(opts: {
  agentCount: number;
  premiumSupport?: boolean;
}): {
  agentCount: number;
  agentsMonthly: number;
  premiumMonthly: number;
  monthlyTotal: number;
  setupFee: number;
  firstMonthTotal: number;
  lines: { label: string; amount: number; cadence: "monthly" | "once" }[];
} {
  const agentsMonthly = agentsMonthlyTotal(opts.agentCount);
  const premiumMonthly = opts.premiumSupport ? PREMIUM_SUPPORT_MONTHLY_USD : 0;
  const monthlyTotal = agentsMonthly + premiumMonthly;
  const setupFee = INTEGRATION_SETUP_FEE_USD;

  const lines: { label: string; amount: number; cadence: "monthly" | "once" }[] = [
    {
      label: `${opts.agentCount} AI agent${opts.agentCount === 1 ? "" : "s"} × $${AGENT_MONTHLY_USD}/mo (includes basic support)`,
      amount: agentsMonthly,
      cadence: "monthly",
    },
  ];

  if (premiumMonthly > 0) {
    lines.push({
      label: `Premium support & monitoring`,
      amount: premiumMonthly,
      cadence: "monthly",
    });
  }

  lines.push({
    label: `Systems integration setup (one-time)`,
    amount: setupFee,
    cadence: "once",
  });

  return {
    agentCount: opts.agentCount,
    agentsMonthly,
    premiumMonthly,
    monthlyTotal,
    setupFee,
    firstMonthTotal: monthlyTotal + setupFee,
    lines,
  };
}

export function estimateMonthlyBill(opts: {
  agentCount: number;
  connectedIntegrations: string[];
  premiumSupport?: boolean;
}): {
  agentsSubtotal: number;
  integrationsSubtotal: number;
  premiumSubtotal: number;
  total: number;
  perAgent: number;
  lines: { label: string; amount: number }[];
} {
  const agentsSubtotal = agentsMonthlyTotal(opts.agentCount);
  const premiumSubtotal = opts.premiumSupport ? PREMIUM_SUPPORT_MONTHLY_USD : 0;
  const lines: { label: string; amount: number }[] = [
    {
      label: `${opts.agentCount} AI agent${opts.agentCount === 1 ? "" : "s"} × $${AGENT_MONTHLY_USD}/mo`,
      amount: agentsSubtotal,
    },
  ];

  if (premiumSubtotal > 0) {
    lines.push({ label: "Premium support & monitoring", amount: premiumSubtotal });
  }

  let integrationsSubtotal = 0;
  for (const id of opts.connectedIntegrations) {
    const fee = integrationFee(id);
    if (fee <= 0) continue;
    integrationsSubtotal += fee;
    lines.push({ label: `Integration: ${id}`, amount: fee });
  }

  return {
    agentsSubtotal,
    integrationsSubtotal,
    premiumSubtotal,
    total: agentsSubtotal + integrationsSubtotal + premiumSubtotal,
    perAgent: AGENT_MONTHLY_USD,
    lines,
  };
}
