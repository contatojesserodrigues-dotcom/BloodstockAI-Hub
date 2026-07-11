export const SUPPORTED_CURRENCIES = [
  { code: "USD", label: "USD — US Dollar", symbol: "$" },
  { code: "EUR", label: "EUR — Euro", symbol: "€" },
  { code: "GBP", label: "GBP — British Pound", symbol: "£" },
  { code: "AUD", label: "AUD — Australian Dollar", symbol: "A$" },
  { code: "CAD", label: "CAD — Canadian Dollar", symbol: "C$" },
  { code: "CHF", label: "CHF — Swiss Franc", symbol: "CHF" },
  { code: "NZD", label: "NZD — New Zealand Dollar", symbol: "NZ$" },
  { code: "JPY", label: "JPY — Japanese Yen", symbol: "¥" },
] as const;

export type BillingCurrency = (typeof SUPPORTED_CURRENCIES)[number]["code"];

/** USD base prices in cents — must match edge function PLAN_USD_CENTS. */
export const PLAN_USD_CENTS = {
  starter: { monthly: 9900, annual: 71100, annualMonthlyPromo: 5900 },
  professional: { monthly: 39900, annual: 287100, annualMonthlyPromo: 23900 },
} as const;

const ZERO_DECIMAL = new Set(["JPY"]);

export function formatMoney(amountMinor: number, currency: string): string {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL.has(code)) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amountMinor);
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export async function fetchUsdRates(): Promise<Record<string, number>> {
  const targets = SUPPORTED_CURRENCIES.map((c) => c.code).filter((c) => c !== "USD").join(",");
  const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${targets}`);
  if (!res.ok) throw new Error("Failed to load exchange rates");
  const data = await res.json();
  return { USD: 1, ...(data.rates ?? {}) };
}

export function convertUsdCentsClient(
  usdCents: number,
  currency: string,
  rates: Record<string, number>,
): number {
  const code = currency.toUpperCase();
  const rate = rates[code] ?? 1;
  const major = (usdCents / 100) * rate;
  if (ZERO_DECIMAL.has(code)) return Math.max(1, Math.round(major));
  return Math.max(1, Math.round(major * 100));
}

export function displayPlanPrice(
  planKey: keyof typeof PLAN_USD_CENTS,
  billingCycle: "monthly" | "annual",
  currency: string,
  rates: Record<string, number>,
): { main: string; annualTotal?: string } {
  const plan = PLAN_USD_CENTS[planKey];
  if (billingCycle === "monthly") {
    const cents = convertUsdCentsClient(plan.monthly, currency, rates);
    return { main: formatMoney(cents, currency) };
  }

  const monthlyPromo = convertUsdCentsClient(plan.annualMonthlyPromo, currency, rates);
  const annualTotal = convertUsdCentsClient(plan.annual, currency, rates);
  return {
    main: formatMoney(monthlyPromo, currency),
    annualTotal: formatMoney(annualTotal, currency),
  };
}
