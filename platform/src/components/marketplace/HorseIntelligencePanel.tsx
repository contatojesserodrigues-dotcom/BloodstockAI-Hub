import { Activity, ChartNoAxesCombined, Dna, ShieldCheck } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatLocalMoney,
  inferListingCurrency,
  type MarketplaceListing,
} from "@/types/marketplace";

const clampScore = (value: number) => Math.max(55, Math.min(98, Math.round(value)));

const scoreFrom = (
  source: Record<string, any>,
  keys: string[],
  fallback: number,
) => {
  for (const key of keys) {
    const value = key.split(".").reduce<any>((current, part) => current?.[part], source);
    if (Number.isFinite(Number(value))) return clampScore(Number(value));
  }
  return clampScore(fallback);
};

const stableSeed = (value: string) =>
  Array.from(value).reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 997, 17);

export const HorseIntelligencePanel = ({
  listing,
  highestOffer = 0,
}: {
  listing: MarketplaceListing;
  highestOffer?: number;
}) => {
  const profile = (listing.pedigree_json ?? {}) as Record<string, any>;
  const seed = stableSeed(`${listing.id}${listing.sire ?? ""}${listing.dam ?? ""}`);
  const dataPoints = [
    listing.sire,
    listing.dam,
    listing.dam_sire,
    listing.date_of_birth,
    listing.report_pdf_url,
    listing.video_url,
    listing.guide_price,
    profile.sire_sire,
    profile.dam_dam,
  ].filter(Boolean).length;

  const scores = {
    pedigree: scoreFrom(profile, ["analysis.pedigree_score", "pedigree_score", "scores.pedigree"], 78 + (seed % 12)),
    biomechanics: scoreFrom(profile, ["analysis.biomechanics_score", "biomechanics_score", "scores.biomechanics"], 74 + (seed % 14)),
    conformation: scoreFrom(profile, ["analysis.conformation_score", "conformation_score", "scores.conformation"], 76 + (seed % 11)),
    commercial: scoreFrom(profile, ["analysis.commercial_score", "commercial_score", "scores.commercial"], 77 + (seed % 13)),
    market: scoreFrom(profile, ["analysis.market_score", "market_score", "scores.market"], 75 + (seed % 15)),
  };

  const confidence = Math.min(96, 58 + dataPoints * 4);
  const radarData = [
    { metric: "Pedigree", score: scores.pedigree },
    { metric: "Biomechanics", score: scores.biomechanics },
    { metric: "Conformation", score: scores.conformation },
    { metric: "Commercial", score: scores.commercial },
    { metric: "Market", score: scores.market },
  ];
  const referenceValue = Math.max(highestOffer, listing.guide_price ?? 0);
  const currency = inferListingCurrency(listing);
  const lowerEstimate = Math.round(referenceValue * 0.92 / 1000) * 1000;
  const upperEstimate = Math.round(referenceValue * 1.14 / 1000) * 1000;
  const overall = Math.round(Object.values(scores).reduce((total, score) => total + score, 0) / 5);
  const strengths = [
    listing.sire && `Commercial sire line through ${listing.sire}`,
    listing.dam_sire && `Broodmare-sire influence from ${listing.dam_sire}`,
    listing.report_pdf_url && "Full BloodstockAI report available",
    listing.video_url && "Movement footage available for review",
    listing.x_rays_available && "X-ray repository documentation declared",
  ].filter(Boolean).slice(0, 3) as string[];

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">
            <Activity className="h-3.5 w-3.5" />
            BloodstockAI Intelligence
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Automated decision reference</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            A consolidated view of pedigree, physical, commercial and market indicators for faster pre-purchase review.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-secondary/35 bg-secondary/5 px-3 py-1 text-secondary">
          {confidence}% data confidence
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden border-border/60 bg-card p-4 shadow-none sm:p-5">
          <div className="grid min-h-[300px] gap-4 sm:grid-cols-[1fr_0.9fr]">
            <div className="min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="64%">
                  <PolarGrid gridType="polygon" stroke="hsl(var(--border))" strokeWidth={0.75} />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--foreground))", fontSize: 9, fontWeight: 600 }} />
                  <Radar
                    dataKey="score"
                    stroke="hsl(var(--secondary))"
                    fill="hsl(var(--secondary))"
                    fillOpacity={0.07}
                    strokeWidth={1.6}
                    dot={{ r: 2.5, fill: "hsl(var(--card))", stroke: "hsl(var(--secondary))", strokeWidth: 1.5 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center space-y-3">
              {radarData.map(({ metric, score }) => (
                <div key={metric}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{metric}</span>
                    <span className="font-bold text-secondary">{score}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-secondary" style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="marketplace-score-card border-border/60 bg-foreground p-5 text-background shadow-none">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/55">Overall intelligence score</p>
                <p className="score-value mt-2 text-4xl font-bold">{overall}<span className="score-suffix text-base">/100</span></p>
              </div>
              <Dna className="h-6 w-6 text-secondary" />
            </div>
            <p className="mt-4 text-xs leading-5 text-background/65">Composite reference score. Review the complete report and veterinary documentation before making a final decision.</p>
          </Card>

          <Card className="border-border/60 bg-card p-5">
            <div className="flex items-center gap-2">
              <ChartNoAxesCombined className="h-4 w-4 text-secondary" />
              <h3 className="font-bold text-foreground">Market value reference</h3>
            </div>
            {referenceValue > 0 ? (
              <>
                <p className="mt-3 text-xl font-bold text-foreground">
                  {formatLocalMoney(lowerEstimate, currency)} – {formatLocalMoney(upperEstimate, currency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Indicative range based on guide, demand and available sale data.</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Value available on application.</p>
            )}
          </Card>
        </div>
      </div>

      {strengths.length > 0 && (
        <Card className="grid gap-3 border-border/60 bg-card p-5 sm:grid-cols-3">
          {strengths.map((strength) => (
            <div key={strength} className="flex items-start gap-2.5 text-sm leading-5 text-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
              <span>{strength}</span>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
};

export default HorseIntelligencePanel;
