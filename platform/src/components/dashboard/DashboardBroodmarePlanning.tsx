import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  Upload,
  Loader2,
  Download,
  Sparkles,
  Calendar,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  generateBroodmarePlan,
  fileToBase64,
  type BroodmarePlanResult,
  type MareInput,
  type PreviousFoal,
} from "@/services/broodmarePlanningService";
import { generateBroodmarePlanningPdf } from "@/utils/broodmarePlanningPdfReport";

const OBJECTIVES = [
  "Elite Commercial Yearling",
  "Elite Breeze-Up Prospect",
  "Classic Horse",
  "Derby Horse",
  "Guineas Horse",
  "Sprint Horse",
  "Miler",
  "Middle Distance",
  "Stayer",
  "National Hunt",
  "Owner-Breeder",
  "Pinhook",
  "Future Stallion Prospect",
  "Future Broodmare",
  "International Sales",
  "Domestic Sales",
  "Racing Performance",
  "Commercial ROI",
  "Long-Term Family Development",
];

const DURATIONS = [2, 3, 4, 5, 6] as const;

const DEFAULT_MARE: MareInput = {
  name: "",
  year_of_birth: new Date().getFullYear() - 8,
  owner: "",
  farm: "",
  country: "",
  registration_authority: "",
  colour: "",
  breeding_status: "maiden",
  previous_foals: [],
  previous_stallions: [],
  produce_notes: "",
};

export function DashboardBroodmarePlanning() {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [mare, setMare] = useState<MareInput>(DEFAULT_MARE);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [duration, setDuration] = useState<2 | 3 | 4 | 5 | 6>(3);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<BroodmarePlanResult | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [activeSeason, setActiveSeason] = useState(0);

  const age = useMemo(
    () => new Date().getFullYear() - (mare.year_of_birth || new Date().getFullYear()),
    [mare.year_of_birth],
  );

  const toggleObjective = (o: string) =>
    setObjectives((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));

  const addFoal = () =>
    setMare((m) => ({ ...m, previous_foals: [...(m.previous_foals ?? []), {}] }));
  const updateFoal = (i: number, patch: Partial<PreviousFoal>) =>
    setMare((m) => ({
      ...m,
      previous_foals: (m.previous_foals ?? []).map((f, idx) =>
        idx === i ? { ...f, ...patch } : f,
      ),
    }));
  const removeFoal = (i: number) =>
    setMare((m) => ({
      ...m,
      previous_foals: (m.previous_foals ?? []).filter((_, idx) => idx !== i),
    }));

  const canStep2 = mare.name.trim().length > 0 && mare.year_of_birth > 1980;
  const canStep3 = objectives.length > 0;

  const onGenerate = async () => {
    setLoading(true);
    try {
      const pedigree_pdf_base64 = pdfFile ? await fileToBase64(pdfFile) : undefined;
      const res = await generateBroodmarePlan({
        mare,
        objectives,
        duration_years: duration,
        pedigree_pdf_base64,
        pedigree_pdf_name: pdfFile?.name,
        notes,
      });
      setPlan(res.plan);
      setPlanId(res.plan_id);
      setStep(4);
      toast({
        title: "Breeding plan ready",
        description: `${res.plan.seasons?.length ?? 0}-season strategy generated.`,
      });
    } catch (e: any) {
      toast({
        title: "Generation failed",
        description: e?.message ?? "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onDownloadPdf = async () => {
    if (!plan) return;
    try {
      const blob = await generateBroodmarePlanningPdf(mare, plan);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BloodstockAI_Broodmare_Plan_${mare.name.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "PDF error", description: e?.message ?? "", variant: "destructive" });
    }
  };

  // ============ RESULTS DASHBOARD ============
  if (step === 4 && plan) {
    return (
      <ResultsDashboard
        mare={mare}
        plan={plan}
        activeSeason={activeSeason}
        setActiveSeason={setActiveSeason}
        onReset={() => {
          setPlan(null);
          setPlanId(null);
          setStep(1);
        }}
        onDownloadPdf={onDownloadPdf}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/10">
              <Heart className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <CardTitle className="text-xl">AI Broodmare Planning</CardTitle>
              <CardDescription>
                Multi-season strategic breeding intelligence — pedigree, genetics, market, ROI.
              </CardDescription>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-2">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    step >= (n as 1 | 2 | 3)
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {n}
                </div>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {n === 1 ? "Broodmare" : n === 2 ? "Objectives" : "Plan duration"}
                </span>
                {n < 3 && <div className="w-6 h-px bg-border" />}
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <Step1Mare
              mare={mare}
              setMare={setMare}
              age={age}
              pdfFile={pdfFile}
              setPdfFile={setPdfFile}
              addFoal={addFoal}
              updateFoal={updateFoal}
              removeFoal={removeFoal}
            />
          )}
          {step === 2 && (
            <Step2Objectives objectives={objectives} toggle={toggleObjective} />
          )}
          {step === 3 && (
            <Step3Duration duration={duration} setDuration={setDuration} notes={notes} setNotes={setNotes} />
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              disabled={step === 1 || loading}
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
            >
              Back
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                disabled={(step === 1 && !canStep2) || (step === 2 && !canStep3)}
              >
                Continue
              </Button>
            ) : (
              <Button onClick={onGenerate} disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating strategy…
                  </>
                ) : (
                  <>
                    Generate Broodmare Plan
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Step 1
// ────────────────────────────────────────────────────────────
function Step1Mare(props: {
  mare: MareInput;
  setMare: (fn: (m: MareInput) => MareInput) => void;
  age: number;
  pdfFile: File | null;
  setPdfFile: (f: File | null) => void;
  addFoal: () => void;
  updateFoal: (i: number, patch: Partial<PreviousFoal>) => void;
  removeFoal: (i: number) => void;
}) {
  const { mare, setMare, age, pdfFile, setPdfFile, addFoal, updateFoal, removeFoal } = props;
  const upd = <K extends keyof MareInput>(k: K, v: MareInput[K]) =>
    setMare((m) => ({ ...m, [k]: v }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <Label>Broodmare name *</Label>
        <Input value={mare.name} onChange={(e) => upd("name", e.target.value)} />
      </div>
      <div>
        <Label>Year of birth *</Label>
        <Input
          type="number"
          value={mare.year_of_birth}
          onChange={(e) => upd("year_of_birth", Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground mt-1">Age: {age}</p>
      </div>
      <div>
        <Label>Owner</Label>
        <Input value={mare.owner ?? ""} onChange={(e) => upd("owner", e.target.value)} />
      </div>
      <div>
        <Label>Farm</Label>
        <Input value={mare.farm ?? ""} onChange={(e) => upd("farm", e.target.value)} />
      </div>
      <div>
        <Label>Country</Label>
        <Input value={mare.country ?? ""} onChange={(e) => upd("country", e.target.value)} />
      </div>
      <div>
        <Label>Registration authority</Label>
        <Input
          value={mare.registration_authority ?? ""}
          onChange={(e) => upd("registration_authority", e.target.value)}
          placeholder="Weatherbys, Jockey Club, etc."
        />
      </div>
      <div>
        <Label>Colour</Label>
        <Input value={mare.colour ?? ""} onChange={(e) => upd("colour", e.target.value)} />
      </div>
      <div>
        <Label>Breeding status</Label>
        <Select
          value={mare.breeding_status}
          onValueChange={(v) => upd("breeding_status", v as "maiden" | "proven")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="maiden">Maiden Broodmare</SelectItem>
            <SelectItem value="proven">Has Produced Foals</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="md:col-span-2 border border-dashed rounded-lg p-4">
        <Label className="flex items-center gap-2">
          <Upload className="h-4 w-4" /> Mare pedigree PDF (Weatherbys, Tatts, Goffs, Arqana, OBS, Keeneland, MM, Inglis, Fasig-Tipton)
        </Label>
        <Input
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
          className="mt-2"
        />
        {pdfFile && (
          <p className="text-xs text-muted-foreground mt-2">
            {pdfFile.name} · {(pdfFile.size / 1024 / 1024).toFixed(2)} MB · parsed by BloodstockAI
          </p>
        )}
      </div>

      {mare.breeding_status === "proven" && (
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label>Previous foals</Label>
            <Button size="sm" variant="outline" onClick={addFoal} className="gap-1">
              <Plus className="h-4 w-4" /> Add foal
            </Button>
          </div>
          {(mare.previous_foals ?? []).map((f, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-6 items-end border rounded-md p-3">
              <div>
                <Label className="text-xs">Year</Label>
                <Input
                  type="number"
                  value={f.year ?? ""}
                  onChange={(e) => updateFoal(i, { year: Number(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label className="text-xs">Sire</Label>
                <Input value={f.sire ?? ""} onChange={(e) => updateFoal(i, { sire: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Sex</Label>
                <Input value={f.sex ?? ""} onChange={(e) => updateFoal(i, { sex: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Sale result</Label>
                <Input
                  value={f.sale_result ?? ""}
                  onChange={(e) => updateFoal(i, { sale_result: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Racing result</Label>
                <Input
                  value={f.racing_result ?? ""}
                  onChange={(e) => updateFoal(i, { racing_result: e.target.value })}
                />
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeFoal(i)} className="gap-1 text-destructive">
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            </div>
          ))}
          <div>
            <Label>Produce notes</Label>
            <Textarea
              rows={3}
              value={mare.produce_notes ?? ""}
              onChange={(e) => upd("produce_notes", e.target.value)}
              placeholder="Notable produce, stakes performers, current racing stock…"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Step 2 / 3
// ────────────────────────────────────────────────────────────
function Step2Objectives({
  objectives,
  toggle,
}: {
  objectives: string[];
  toggle: (o: string) => void;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">
        Select every objective relevant to this mare. The AI weights every season's recommendation
        against your goals.
      </p>
      <div className="flex flex-wrap gap-2">
        {OBJECTIVES.map((o) => {
          const on = objectives.includes(o);
          return (
            <button
              key={o}
              onClick={() => toggle(o)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                on
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "bg-card text-muted-foreground border-border hover:border-secondary"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Selected: <strong>{objectives.length}</strong>
      </p>
    </div>
  );
}

function Step3Duration({
  duration,
  setDuration,
  notes,
  setNotes,
}: {
  duration: 2 | 3 | 4 | 5 | 6;
  setDuration: (d: 2 | 3 | 4 | 5 | 6) => void;
  notes: string;
  setNotes: (n: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label>Plan duration</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`p-3 rounded-lg border text-center transition-all ${
                duration === d
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-border text-muted-foreground hover:border-secondary"
              }`}
            >
              <div className="text-lg font-bold">{d}</div>
              <div className="text-xs">{d}-Year Plan</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          The AI generates an independent Top-25 stallion list, commercial goal and ROI projection for
          every season, adapting to the mare's age and evolving market.
        </p>
      </div>
      <div>
        <Label>Optional client notes</Label>
        <Textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Target sales venues, budget ceilings, stud-fee preferences, geographic constraints…"
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Results dashboard
// ────────────────────────────────────────────────────────────
function ResultsDashboard({
  mare,
  plan,
  activeSeason,
  setActiveSeason,
  onReset,
  onDownloadPdf,
}: {
  mare: MareInput;
  plan: BroodmarePlanResult;
  activeSeason: number;
  setActiveSeason: (i: number) => void;
  onReset: () => void;
  onDownloadPdf: () => void;
}) {
  const radarData = useMemo(
    () =>
      Object.entries(plan.scores || {}).map(([k, v]) => ({
        metric: k.replace(/_/g, " "),
        value: Math.max(0, Math.min(100, Number(v) || 0)),
      })),
    [plan.scores],
  );
  const perfData = useMemo(
    () =>
      Object.entries(plan.performance_projection || {}).map(([k, v]) => ({
        type: k.replace(/_/g, " "),
        probability: Math.round((Number(v) || 0) * 100),
      })),
    [plan.performance_projection],
  );
  const seasonCurve = useMemo(
    () =>
      (plan.seasons || []).map((s) => ({
        year: s.year,
        yearling_mid: s.expected_yearling_value_usd?.mid ?? 0,
        yearling_high: s.expected_yearling_value_usd?.high ?? 0,
        roi: s.expected_roi_percent ?? 0,
      })),
    [plan.seasons],
  );
  const season = plan.seasons?.[activeSeason];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{mare.name} — Strategic Breeding Plan</CardTitle>
            <CardDescription>
              {plan.seasons?.length}-season plan · {mare.breeding_status === "proven" ? "Proven" : "Maiden"} ·
              YOB {mare.year_of_birth} · {mare.country || "—"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onReset}>
              New plan
            </Button>
            <Button onClick={onDownloadPdf} className="gap-2">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{plan.executive_summary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Overall Score Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar
                    dataKey="value"
                    stroke="hsl(var(--secondary))"
                    fill="hsl(var(--secondary))"
                    fillOpacity={0.4}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Expected Performance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perfData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="probability" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-secondary" /> Multi-Year Value & ROI Curve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seasonCurve}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis yAxisId="left" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="yearling_mid" stroke="hsl(var(--secondary))" name="Yearling (mid)" />
                <Line yAxisId="left" type="monotone" dataKey="yearling_high" stroke="#aa8a1e" name="Yearling (high)" />
                <Line yAxisId="right" type="monotone" dataKey="roi" stroke="#16a34a" name="ROI %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] italic text-muted-foreground mt-2">
            Monetary figures are probabilistic projections based on historical market data, pedigree
            quality and current commercial trends — not guaranteed sale prices.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-secondary" /> Multi-Year Strategy Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-3">
            {plan.seasons?.map((s, i) => (
              <button
                key={s.year}
                onClick={() => setActiveSeason(i)}
                className={`min-w-[180px] text-left p-3 rounded-lg border transition-all ${
                  i === activeSeason
                    ? "border-secondary bg-secondary/10"
                    : "border-border hover:border-secondary/50"
                }`}
              >
                <div className="text-xs text-muted-foreground">SEASON {i + 1}</div>
                <div className="text-lg font-bold">{s.year}</div>
                <div className="text-xs">Mare age {s.mare_age_at_cover}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {s.strategic_goal}
                </div>
                <Badge variant="outline" className="mt-2 text-[10px]">
                  {s.top_stallions?.[0]?.name ?? "—"}
                </Badge>
              </button>
            ))}
          </div>

          {season && (
            <div className="mt-4 border-t pt-4">
              <Tabs defaultValue="top25">
                <TabsList>
                  <TabsTrigger value="top25">Top 25 Stallions</TabsTrigger>
                  <TabsTrigger value="alt">Alternatives</TabsTrigger>
                  <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
                </TabsList>
                <TabsContent value="top25">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Stallion</TableHead>
                          <TableHead>Compat</TableHead>
                          <TableHead>Nick</TableHead>
                          <TableHead>Pedigree</TableHead>
                          <TableHead>Commercial</TableHead>
                          <TableHead>Diversity</TableHead>
                          <TableHead>ROI%</TableHead>
                          <TableHead>Risk</TableHead>
                          <TableHead>Conf</TableHead>
                          <TableHead>Distance</TableHead>
                          <TableHead>Surface</TableHead>
                          <TableHead>Maturity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {season.top_stallions?.map((s) => (
                          <TableRow key={`${season.year}-${s.rank}-${s.name}`}>
                            <TableCell>{s.rank}</TableCell>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell>{s.compatibility_score}</TableCell>
                            <TableCell>{s.nick_rating}</TableCell>
                            <TableCell>{s.pedigree_score}</TableCell>
                            <TableCell>{s.commercial_score}</TableCell>
                            <TableCell>{s.genetic_diversity}</TableCell>
                            <TableCell>{s.expected_roi_percent}</TableCell>
                            <TableCell>{s.risk_rating}</TableCell>
                            <TableCell>{s.confidence_score}</TableCell>
                            <TableCell>{s.expected_distance}</TableCell>
                            <TableCell>{s.expected_surface}</TableCell>
                            <TableCell>{s.expected_maturity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                <TabsContent value="alt" className="space-y-2 pt-3">
                  {season.alternative_stallions?.map((a, i) => (
                    <div key={i} className="border rounded p-3">
                      <div className="flex justify-between items-center">
                        <strong>{a.name}</strong>
                        <Badge variant="secondary">Score {a.compatibility_score}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{a.rationale}</p>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="reasoning" className="pt-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Strategic goal" value={season.strategic_goal} />
                    <Field label="Commercial goal" value={season.commercial_goal} />
                    <Field label="Expected market" value={season.expected_market} />
                    <Field label="Racing profile" value={season.expected_racing_profile} />
                    <Field
                      label="Yearling value range"
                      value={`$${season.expected_yearling_value_usd?.low?.toLocaleString()} – $${season.expected_yearling_value_usd?.high?.toLocaleString()}`}
                    />
                    <Field label="Expected ROI" value={`${season.expected_roi_percent}%`} />
                  </div>
                  <p className="text-sm leading-relaxed mt-4">{season.reasoning}</p>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" /> Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{plan.risk_assessment}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-secondary" /> Final Professional Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{plan.final_recommendation}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}