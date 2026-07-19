// ════════════════════════════════════════════════════════════════════
// VideoPoseViewer
// Premium interactive video pose-mapping for Sale Inspection & Visual
// Analysis. Renders pre-computed Claude Vision pose data on top of the
// extracted frames — no calculation is re-done client side.
// ════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Play, Pause, ChevronLeft, ChevronRight, Flame, Activity, GitCompareArrows } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend as ReLegend, CartesianGrid } from "recharts";
import { BONES, JOINT_COLOR, POINT_ANGLE, bandColor, type PoseFrame, type Keypoints } from "@/utils/poseAngles";
const HORSE_ANATOMY_SRC = "/landing/conformation-horse.png";

const TRACKED_ANGLES = ["shoulder", "hip", "knee", "hock", "back", "neck"] as const;

export interface VideoPoseViewerProps {
  frames: PoseFrame[];
  title?: string;
}

function drawSkeleton(
  canvas: HTMLCanvasElement,
  frame: PoseFrame,
  opts: { heatPoints?: Array<{ x: number; y: number; w: number }>; alphaSkeleton?: number } = {},
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const k = frame.keypoints;
  if (!k) return;

  // Heatmap layer first (sits under skeleton)
  if (opts.heatPoints?.length) {
    for (const p of opts.heatPoints) {
      const r = Math.max(28, Math.min(W, H) * 0.06) * (0.4 + p.w);
      const grad = ctx.createRadialGradient(p.x * W, p.y * H, 0, p.x * W, p.y * H, r);
      grad.addColorStop(0, "rgba(239, 68, 68, 0.45)");
      grad.addColorStop(0.6, "rgba(234, 179, 8, 0.18)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Bones
  const skelAlpha = opts.alphaSkeleton ?? 0.85;
  ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.004);
  ctx.strokeStyle = `rgba(255,255,255,${skelAlpha})`;
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 4;
  for (const [a, b] of BONES) {
    const pa = (k as any)[a], pb = (k as any)[b];
    if (!pa || !pb) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x * W, pa.y * H);
    ctx.lineTo(pb.x * W, pb.y * H);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Body centre line (withers → croup)
  if (k.withers && k.croup) {
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(255, 205, 50, 0.7)";
    ctx.beginPath();
    ctx.moveTo(k.withers.x * W, k.withers.y * H);
    ctx.lineTo(k.croup.x * W, k.croup.y * H);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Joint dots, coloured by score band
  const radius = Math.max(5, Math.min(W, H) * 0.011);
  for (const [name, pt] of Object.entries(k) as [string, any][]) {
    if (!pt || typeof pt.x !== "number") continue;
    const angleKey = POINT_ANGLE[name] ?? "good";
    const color = bandColor(angleKey, frame.angles?.[angleKey] ?? null);
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pt.x * W, pt.y * H, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function FrameCanvas({ frame, heatPoints, alphaSkeleton }: { frame: PoseFrame; heatPoints?: Array<{x:number;y:number;w:number}>; alphaSkeleton?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    const cv = canvasRef.current;
    if (!img || !cv) return;
    const draw = () => {
      if (!img.naturalWidth) return;
      cv.width = img.naturalWidth;
      cv.height = img.naturalHeight;
      drawSkeleton(cv, frame, { heatPoints, alphaSkeleton });
    };
    if (img.complete) draw();
    else img.onload = draw;
  }, [frame, heatPoints, alphaSkeleton]);

  return (
    <div ref={wrapRef} className="relative w-full bg-black rounded-lg overflow-hidden mx-auto" style={{ maxHeight: "min(70vh, 560px)" }}>
      <img ref={imgRef} src={frame.dataUrl} alt={`Frame ${frame.index}`} className="w-full h-auto block object-contain" style={{ maxHeight: "min(70vh, 560px)" }} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute top-2 left-2 flex gap-1 text-[10px]">
        <Badge className="bg-black/70 text-white border-none">F{frame.index}</Badge>
        <Badge className="bg-black/70 text-white border-none">{(frame.timestampMs/1000).toFixed(2)}s</Badge>
        <Badge className="bg-black/70 text-white border-none">{frame.stridePhase}</Badge>
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { c: JOINT_COLOR.excellent, l: "Excellent — optimal" },
    { c: JOINT_COLOR.good, l: "Good — minor compensation" },
    { c: JOINT_COLOR.attention, l: "Needs attention" },
    { c: JOINT_COLOR.poor, l: "Refer to vet / farrier" },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      {items.map(i => (
        <div key={i.l} className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: i.c }} />
          {i.l}
        </div>
      ))}
    </div>
  );
}

export function VideoPoseViewer({ frames, title = "Interactive Motion Analysis" }: VideoPoseViewerProps) {
  const usable = useMemo(() => frames.filter(f => f.keypoints), [frames]);
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showHeat, setShowHeat] = useState(false);
  const [cmpA, setCmpA] = useState(0);
  const [cmpB, setCmpB] = useState(Math.max(0, (usable.length - 1)));

  useEffect(() => { setCmpB(Math.max(0, usable.length - 1)); }, [usable.length]);

  // Auto playback
  useEffect(() => {
    if (!playing || usable.length === 0) return;
    const intervalMs = Math.max(80, 400 / speed);
    const id = window.setInterval(() => {
      setCur(c => {
        const next = c + 1;
        if (next >= usable.length) { setPlaying(false); return usable.length - 1; }
        return next;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, speed, usable.length]);

  if (usable.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The vision model couldn't lock onto the horse in any frame. Re-upload a clearer lateral video for the interactive overlay.
        </CardContent>
      </Card>
    );
  }

  const frame = usable[Math.min(cur, usable.length - 1)];

  // Joint movement → heatmap intensity = |angle_t - angle_{t-1}|
  const heatPoints = useMemo(() => {
    if (!showHeat || !frame.keypoints || cur === 0) return [];
    const prev = usable[cur - 1];
    if (!prev?.keypoints) return [];
    const pts: Array<{x:number;y:number;w:number}> = [];
    for (const [name, pt] of Object.entries(frame.keypoints) as [string, any][]) {
      const prevPt = (prev.keypoints as any)[name];
      if (!pt || !prevPt) continue;
      const dx = pt.x - prevPt.x;
      const dy = pt.y - prevPt.y;
      const mag = Math.hypot(dx, dy);
      if (mag > 0.005) pts.push({ x: pt.x, y: pt.y, w: Math.min(1.4, mag * 30) });
    }
    return pts;
  }, [showHeat, cur, frame, usable]);

  const chartData = usable.map(f => {
    const row: any = { t: (f.timestampMs / 1000).toFixed(2), frame: f.index };
    for (const k of TRACKED_ANGLES) row[k] = f.angles?.[k] ?? null;
    return row;
  });

  const STROKE: Record<typeof TRACKED_ANGLES[number], string> = {
    shoulder: "#22c55e", hip: "#3b82f6", knee: "#a855f7", hock: "#eab308", back: "#ef4444", neck: "#06b6d4",
  };

  const angleRows = TRACKED_ANGLES.map(k => ({
    key: k,
    cur: frame.angles?.[k] ?? null,
    color: bandColor(k, frame.angles?.[k] ?? null),
  }));

  // Compare deltas
  const cmpFrameA = usable[Math.min(cmpA, usable.length - 1)];
  const cmpFrameB = usable[Math.min(cmpB, usable.length - 1)];
  const deltas = TRACKED_ANGLES.map(k => {
    const a = cmpFrameA?.angles?.[k];
    const b = cmpFrameB?.angles?.[k];
    return { key: k, a: a ?? null, b: b ?? null, diff: a != null && b != null ? Math.abs((b as number) - (a as number)) : null };
  });

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> {title}
            </CardTitle>
            <CardDescription>
              Pose mapping from BloodstockAI — {usable.length} analysed frame{usable.length === 1 ? "" : "s"}.
            </CardDescription>
          </div>
          <Legend />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="player" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="player"><Play className="w-3.5 h-3.5 mr-1" />Player</TabsTrigger>
            <TabsTrigger value="charts"><Activity className="w-3.5 h-3.5 mr-1" />Charts</TabsTrigger>
            <TabsTrigger value="compare"><GitCompareArrows className="w-3.5 h-3.5 mr-1" />Compare</TabsTrigger>
          </TabsList>

          {/* ── PLAYER ── */}
          <TabsContent value="player" className="space-y-3">
            <div className="flex flex-col xl:flex-row gap-3">
              <div className="space-y-3 min-w-0 flex-1 w-full">
                <FrameCanvas frame={frame} heatPoints={showHeat ? heatPoints : []} />
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" className="h-9 px-3" onClick={() => setCur(c => Math.max(0, c - 1))}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button size="sm" className="h-9 px-3" onClick={() => setPlaying(p => !p)}>
                    {playing ? <Pause className="w-4 h-4 sm:mr-1" /> : <Play className="w-4 h-4 sm:mr-1" />}
                    <span className="hidden sm:inline">{playing ? "Pause" : "Play"}</span>
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 px-3" onClick={() => setCur(c => Math.min(usable.length - 1, c + 1))}><ChevronRight className="w-4 h-4" /></Button>
                  <Select value={String(speed)} onValueChange={(v) => setSpeed(parseFloat(v))}>
                    <SelectTrigger className="w-[90px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.25">0.25×</SelectItem>
                      <SelectItem value="0.5">0.5×</SelectItem>
                      <SelectItem value="1">1×</SelectItem>
                      <SelectItem value="2">2×</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant={showHeat ? "default" : "outline"} className="h-9 px-3" onClick={() => setShowHeat(v => !v)}>
                    <Flame className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Heat</span>
                  </Button>
                  <div className="text-[11px] sm:text-xs text-muted-foreground w-full sm:w-auto sm:ml-auto">
                    F{frame.index + 1}/{usable.length} · {(frame.timestampMs/1000).toFixed(2)}s · {(frame.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex gap-1 overflow-x-auto p-1 bg-muted/30 rounded-md">
                  {usable.map((f, i) => (
                    <button
                      key={f.index}
                      onClick={() => setCur(i)}
                      title={`Frame ${f.index} · ${(f.timestampMs/1000).toFixed(2)}s · ${f.stridePhase}`}
                      className={`relative shrink-0 w-16 h-12 rounded border-2 overflow-hidden transition ${i === cur ? "border-primary ring-2 ring-primary/40" : "border-transparent hover:border-muted-foreground/40"}`}
                    >
                      <img src={f.dataUrl} alt="" className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 right-0 text-[9px] bg-black/70 text-white px-1 rounded-tl">F{f.index}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live angles + anatomical reference */}
              <div className="space-y-3 w-full xl:w-[320px] xl:shrink-0">
                <Card className="border-muted">
                  <CardHeader className="py-2 px-3"><CardTitle className="text-xs">Live joint angles</CardTitle></CardHeader>
                  <CardContent className="py-2 px-3 grid grid-cols-2 xl:grid-cols-1 gap-x-4 gap-y-1.5">
                    {angleRows.map(r => (
                      <div key={r.key} className="flex items-center justify-between text-xs">
                        <span className="capitalize text-muted-foreground">{r.key}</span>
                        <span className="flex items-center gap-2 font-mono">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ background: r.color }} />
                          {r.cur != null ? `${r.cur}°` : "—"}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border-muted">
                  <CardHeader className="py-2 px-3"><CardTitle className="text-xs">Anatomical reference</CardTitle></CardHeader>
                  <CardContent className="p-2">
                    <AnatomicalReference frame={frame} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── CHARTS ── */}
          <TabsContent value="charts" className="space-y-3">
            <div className="h-[260px] sm:h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="t" unit="s" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[60, 200]} unit="°" />
                  <Tooltip />
                  <ReLegend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine x={chartData[cur]?.t} stroke="#ef4444" strokeDasharray="4 4" />
                  {TRACKED_ANGLES.map(k => (
                    <Line key={k} dataKey={k} type="monotone" stroke={STROKE[k]} dot={false} strokeWidth={2} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground">
              Cursor tracks the player. All values come from the existing BloodstockAI pipeline — no recalculation.
            </p>
          </TabsContent>

          {/* ── COMPARE ── */}
          <TabsContent value="compare" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Frame A</label>
                <Select value={String(cmpA)} onValueChange={(v) => setCmpA(parseInt(v))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {usable.map((f, i) => <SelectItem key={`a-${f.index}`} value={String(i)}>F{f.index} · {(f.timestampMs/1000).toFixed(2)}s · {f.stridePhase}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Frame B</label>
                <Select value={String(cmpB)} onValueChange={(v) => setCmpB(parseInt(v))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {usable.map((f, i) => <SelectItem key={`b-${f.index}`} value={String(i)}>F{f.index} · {(f.timestampMs/1000).toFixed(2)}s · {f.stridePhase}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {cmpFrameA && <FrameCanvas frame={cmpFrameA} />}
              {cmpFrameB && <FrameCanvas frame={cmpFrameB} />}
            </div>
            <Card className="border-muted">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {deltas.map(d => (
                    <div key={d.key} className="border rounded p-2 bg-muted/30">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.key}</div>
                      <div className="font-mono">{d.a ?? "—"}° → {d.b ?? "—"}°</div>
                      <div className={`text-[11px] ${d.diff != null && d.diff > 15 ? "text-red-500" : "text-emerald-600"}`}>
                        Δ {d.diff != null ? `${d.diff}°` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ── Photoreal anatomical reference with live colour-coded joint markers ──
const ANATOMY_POINTS: Array<{ key: string; x: number; y: number; label: string }> = [
  { key: "poll",         x: 14,   y: 36, label: "Poll" },
  { key: "withers",      x: 38,   y: 33, label: "Withers" },
  { key: "back",         x: 52,   y: 36, label: "Back" },
  { key: "croup",        x: 68,   y: 36, label: "Croup" },
  { key: "shoulder",     x: 36,   y: 52, label: "Shoulder" },
  { key: "elbow",        x: 37,   y: 64, label: "Elbow" },
  { key: "foreKnee",     x: 37,   y: 78, label: "Knee" },
  { key: "foreFetlock",  x: 37,   y: 88, label: "Fetlock" },
  { key: "foreHoof",     x: 37,   y: 94, label: "Hoof" },
  { key: "hip",          x: 71,   y: 44, label: "Hip" },
  { key: "stifle",       x: 70,   y: 62, label: "Stifle" },
  { key: "hock",         x: 72,   y: 78, label: "Hock" },
  { key: "hindFetlock",  x: 72,   y: 88, label: "Fetlock" },
  { key: "hindHoof",     x: 72,   y: 94, label: "Hoof" },
];

function AnatomicalReference({ frame }: { frame: PoseFrame }) {
  const c = (k: string) => bandColor(POINT_ANGLE[k] ?? "good", frame.angles?.[POINT_ANGLE[k] ?? ""] ?? null);
  return (
    <div className="relative w-full rounded-md overflow-hidden bg-white" style={{ aspectRatio: "4 / 3" }}>
      <img
        src={HORSE_ANATOMY_SRC}
        alt="Anatomical reference"
        className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
        draggable={false}
      />
      <div className="absolute inset-0">
        {ANATOMY_POINTS.map(p => (
          <div
            key={p.key}
            title={`${p.label}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white shadow-md"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: "clamp(5px, 0.9vw, 9px)",
              height: "clamp(5px, 0.9vw, 9px)",
              background: c(p.key),
              boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
            }}
          />
        ))}
      </div>
    </div>
  );
}