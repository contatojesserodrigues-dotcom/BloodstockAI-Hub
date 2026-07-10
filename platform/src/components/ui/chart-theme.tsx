/**
 * Design-system-aligned chart color tokens and config helpers.
 * Use these with recharts / ChartContainer to keep charts on-brand.
 */

/** Categorical palette — ordered for visual distinction */
export const CHART_COLORS = {
  gold: "hsl(43 76% 52%)",
  goldLight: "hsl(45 72% 63%)",
  navy: "hsl(240 7% 5%)",
  silver: "hsl(0 0% 71%)",
  emerald: "hsl(160 60% 45%)",
  amber: "hsl(38 92% 50%)",
  rose: "hsl(350 80% 55%)",
  blue: "hsl(210 80% 55%)",
} as const;

/** Sequential palette for single-hue charts */
export const CHART_SEQUENTIAL = [
  "hsl(43 76% 72%)",
  "hsl(43 76% 62%)",
  "hsl(43 76% 52%)",
  "hsl(43 76% 42%)",
  "hsl(43 76% 32%)",
] as const;

/** Score-based color helper for recharts cells */
export function getScoreColor(score: number, max = 100): string {
  const pct = (score / max) * 100;
  if (pct >= 75) return CHART_COLORS.emerald;
  if (pct >= 50) return CHART_COLORS.gold;
  if (pct >= 25) return CHART_COLORS.amber;
  return CHART_COLORS.rose;
}

/** Default axis / grid styling props for recharts */
export const CHART_AXIS_STYLE = {
  tick: { fill: "hsl(0 0% 71%)", fontSize: 11 },
  axisLine: { stroke: "hsl(0 0% 15%)" },
  tickLine: false as const,
};

export const CHART_GRID_STYLE = {
  strokeDasharray: "3 3",
  stroke: "hsl(0 0% 15%)",
};

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "hsl(240 6% 7%)",
    border: "1px solid hsl(0 0% 15%)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "13px",
  },
};
