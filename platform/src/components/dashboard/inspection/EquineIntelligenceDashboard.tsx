import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity, Dna, Shield, Target, TrendingUp, Zap, AlertTriangle, CheckCircle2, Gauge, Heart,
} from "lucide-react";

export type IntelligenceDashboardData = {
  elite_potential_score?: number | null;
  pedigree_intelligence_score?: number | null;
  biomechanics_score?: number | null;
  conformation_score?: number | null;
  behaviour_score?: number | null;
  hoof_health_score?: number | null;
  soundness_risk?: string | null;
  g1_potential_index?: {
    score?: number;
    tier_label?: string;
    probability_label?: string;
    factors?: string[];
  } | null;
  distance_profile?: {
    sprint?: number;
    mile?: number;
    classic?: number;
    stamina?: number;
    stayer?: number;
    recommended?: string;
  } | null;
  intelligence_scores?: {
    bpi?: number;
    horse_intelligence_score?: number;
    elite_potential?: number;
    components?: {
      biomechanics?: number;
      pedigree?: number;
      conformation?: number;
      behaviour?: number;
      commercial?: number;
    };
    longevity?: { score?: number; total_risk?: number };
    roi?: { score?: number };
    stride_analysis?: {
      stride_length_m?: number;
      stride_frequency?: number;
      stride_efficiency?: number;
    };
    energy_economy?: number;
    spi_score?: number;
  } | null;
  roi_projection?: { score?: number } | null;
  processing_status?: string | null;
  engine_version?: string | null;
};

function ScoreRing({ label, value, icon: Icon, color }: {
  label: string; value: number | null | undefined; icon: React.ElementType; color: string;
}) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(100, v));
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card/80">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
          <circle
            cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5"
            stroke={color}
            strokeDasharray={`${pct} 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{value != null ? Math.round(v) : "—"}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground text-center">
        <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
      </div>
    </div>
  );
}

function RiskBadge({ risk }: { risk?: string | null }) {
  if (!risk) return null;
  const map: Record<string, { cls: string; icon: React.ElementType }> = {
    Low: { cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
    Medium: { cls: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertTriangle },
    High: { cls: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle },
  };
  const cfg = map[risk] || map.Medium;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cfg.cls}>
      <Icon className="w-3 h-3 mr-1" /> Longevity: {risk}
    </Badge>
  );
}

export function EquineIntelligenceDashboard({ data }: { data: IntelligenceDashboardData }) {
  const intel = data.intelligence_scores;
  const his = intel?.horse_intelligence_score ?? data.elite_potential_score ?? intel?.elite_potential;
  const bpi = intel?.bpi ?? data.biomechanics_score;
  const components = intel?.components;
  const dp = data.distance_profile;
  const g1 = data.g1_potential_index;
  const longevity = intel?.longevity?.score;
  const roi = intel?.roi?.score ?? data.roi_projection?.score;

  const stayerVal = dp?.stayer ?? dp?.stamina;

  return (
    <Card className="border-[#C9A227]/30 bg-gradient-to-br from-white via-white to-amber-50/30">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#C9A227]" />
              Equine Intelligence Inspection Engine™
            </CardTitle>
            <CardDescription>
              BPI · Horse Intelligence Score · G1 · Distance · ROI · Longevity
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.engine_version && (
              <Badge variant="secondary" className="text-xs">{data.engine_version}</Badge>
            )}
            <RiskBadge risk={data.soundness_risk} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hero scores: HIS + BPI */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-[#0A1628] text-white">
            <p className="text-xs uppercase tracking-widest text-white/60 mb-1">Horse Intelligence Score</p>
            <p className="text-4xl font-bold text-[#C9A227]">
              {his != null ? Math.round(his) : "—"}<span className="text-xl text-white/50">/100</span>
            </p>
            {g1 && (
              <p className="text-sm mt-2 text-white/80">
                {g1.tier_label || g1.probability_label || "—"}
              </p>
            )}
          </div>
          <div className="p-5 rounded-xl bg-[#0A1628]/90 text-white border border-[#C9A227]/30">
            <p className="text-xs uppercase tracking-widest text-white/60 mb-1 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" /> Biomechanical Performance Index (BPI)
            </p>
            <p className="text-4xl font-bold text-blue-300">
              {bpi != null ? Math.round(bpi) : "—"}<span className="text-xl text-white/50">/100</span>
            </p>
            <p className="text-[10px] text-white/50 mt-2">
              Stride 30% · Symmetry 20% · Joints 20% · Power 15% · Economy 15%
            </p>
          </div>
        </div>

        {/* Secondary: Longevity + ROI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border text-center">
            <p className="text-[10px] uppercase text-muted-foreground">Longevity</p>
            <p className="text-2xl font-bold flex items-center justify-center gap-1">
              <Heart className="w-4 h-4 text-rose-500" />
              {longevity != null ? Math.round(longevity) : "—"}
            </p>
          </div>
          <div className="p-3 rounded-lg border text-center">
            <p className="text-[10px] uppercase text-muted-foreground">ROI Score</p>
            <p className="text-2xl font-bold">{roi != null ? Math.round(roi) : "—"}</p>
          </div>
          {typeof intel?.spi_score === "number" && (
            <div className="p-3 rounded-lg border text-center">
              <p className="text-[10px] uppercase text-muted-foreground">SPI</p>
              <p className="text-2xl font-bold">{Math.round(intel.spi_score)}</p>
            </div>
          )}
          {typeof intel?.energy_economy === "number" && (
            <div className="p-3 rounded-lg border text-center">
              <p className="text-[10px] uppercase text-muted-foreground">Energy Economy</p>
              <p className="text-2xl font-bold">{Math.round(intel.energy_economy)}</p>
            </div>
          )}
        </div>

        {/* Component rings — HIS weights */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            HIS weights: Movement 35% · Pedigree 25% · Conformation 20% · Behaviour 10% · Commercial 10%
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <ScoreRing label="Movement (BPI)" value={components?.biomechanics ?? bpi} icon={Activity} color="#3B82F6" />
            <ScoreRing label="Pedigree" value={data.pedigree_intelligence_score ?? components?.pedigree} icon={Dna} color="#8B5CF6" />
            <ScoreRing label="Conformation" value={data.conformation_score ?? components?.conformation} icon={Target} color="#10B981" />
            <ScoreRing label="Behaviour" value={data.behaviour_score ?? components?.behaviour} icon={Shield} color="#F59E0B" />
            <ScoreRing label="Commercial" value={components?.commercial} icon={TrendingUp} color="#C9A227" />
          </div>
        </div>

        {/* Distance indices */}
        {dp && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Racing Distance Model</p>
            {dp.recommended && (
              <p className="text-xs text-muted-foreground">
                Recommended: <span className="font-medium text-foreground">{dp.recommended}</span>
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              {([
                ["Sprint Index", dp.sprint],
                ["Mile Index", dp.mile],
                ["Classic Index", dp.classic],
                ["Stayer Index", stayerVal],
              ] as const).map(([label, val]) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{label}</span>
                    <span className="font-medium">{val ?? 0}/100</span>
                  </div>
                  <Progress value={val ?? 0} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {g1?.factors?.length ? (
          <ul className="text-xs text-muted-foreground space-y-0.5 border-t pt-3">
            {g1.factors.slice(0, 4).map((f) => <li key={f}>• {f}</li>)}
          </ul>
        ) : null}

        {data.processing_status && data.processing_status !== "complete" && (
          <p className="text-xs text-muted-foreground text-center">
            Upload walk/trot/breeze video + pedigree to compute BPI and full intelligence scores.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
