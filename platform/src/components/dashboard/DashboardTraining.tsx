import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { Activity, Download, FileSpreadsheet, Gauge, Heart, Loader2, Plus, TrendingUp, Video, Trash2 } from "lucide-react";
import { Sparkles, Thermometer, Scale } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from "recharts";
import { downloadTrainingReportPDF } from "@/utils/trainingPdfReport";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Horse = {
  id: string; name: string; age: number|null; sex: string|null; breed: string|null;
  sire: string|null; dam: string|null; dam_sire: string|null; trainer: string|null;
  owner: string|null; stable: string|null; country: string|null; training_centre: string|null;
  racing_code: string|null; status: string|null; photo_url: string|null; notes: string|null;
};
type Session = {
  id: string; horse_id: string; session_date: string; location: string|null;
  surface: string|null; distance_m: number|null; exercise_type: string|null;
  rider: string|null; weather: string|null; ground_condition: string|null;
  trainer_notes: string|null; vet_notes: string|null; video_url: string|null;
  gps_file_url: string|null; status: string;
  temperature_c: number|null; body_weight_kg: number|null; resting_heart_rate: number|null;
};
type Analysis = { id: string; session_id: string; metrics: any; scores: any; ai_narrative: string|null; recommendations: any; created_at: string; };
type Gps = { id: string; session_id: string; provider: string|null; metrics: any; created_at: string; };

async function extractFrames(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    const c = document.createElement("canvas");
    v.preload = "auto"; v.muted = true; v.playsInline = true;
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    const timer = window.setTimeout(() => { cleanup(); reject(new Error("Video load timeout. Export as H.264 MP4.")); }, 20000);
    v.src = url;
    v.onloadedmetadata = () => {
      const d = v.duration; if (!Number.isFinite(d) || d <= 0) { clearTimeout(timer); cleanup(); reject(new Error("Invalid duration")); return; }
      const ctx = c.getContext("2d"); if (!ctx) { clearTimeout(timer); cleanup(); reject(new Error("No canvas")); return; }
      const out: string[] = [];
      const ts = [0.08,0.2,0.32,0.44,0.56,0.68,0.8,0.92].map(r => Math.min(Math.max(d*r,0.05), Math.max(d-0.05,0.05)));
      let i = 0;
      v.onseeked = () => {
        c.width = Math.min(v.videoWidth, 960);
        c.height = Math.round(c.width * (v.videoHeight / v.videoWidth));
        ctx.drawImage(v, 0, 0, c.width, c.height);
        out.push(c.toDataURL("image/jpeg", 0.75));
        i++;
        if (i < ts.length) { try { v.currentTime = ts[i]; } catch { /* */ } }
        else { clearTimeout(timer); cleanup(); resolve(out); }
      };
      try { v.currentTime = ts[0]; } catch { clearTimeout(timer); cleanup(); reject(new Error("Seek failed")); }
    };
    v.onerror = () => { clearTimeout(timer); cleanup(); reject(new Error("Failed to load video")); };
    v.load();
  });
}

function csvFor(analyses: Analysis[]) {
  const rows = analyses.map(a => ({ date: a.created_at, ...(a.scores||{}), ...(a.metrics||{}) }));
  if (!rows.length) return "";
  const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  return [keys.join(","), ...rows.map(r => keys.map(k => JSON.stringify((r as any)[k] ?? "")).join(","))].join("\n");
}

function download(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function DashboardTraining() {
  const { user } = useAuth();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [selectedHorse, setSelectedHorse] = useState<Horse|null>(null);
  const [tab, setTab] = useState("horses");

  useEffect(() => { if (user) loadHorses(); }, [user]);

  async function loadHorses() {
    const { data } = await supabase.from("training_horses").select("*").order("created_at", { ascending: false });
    setHorses((data ?? []) as Horse[]);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-secondary"/>Training Analysis Center</CardTitle>
          <p className="text-xs text-muted-foreground">Long-term performance database for every horse — video biomechanics, GPS data, scores, history and reports. Cautious, non-diagnostic language throughout.</p>
        </CardHeader>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="horses">Horse Profiles</TabsTrigger>
          <TabsTrigger value="new" disabled={!selectedHorse}>New Session</TabsTrigger>
          <TabsTrigger value="video" disabled={!selectedHorse}>Video Analysis</TabsTrigger>
          <TabsTrigger value="gps" disabled={!selectedHorse}>GPS Upload</TabsTrigger>
          <TabsTrigger value="history" disabled={!selectedHorse}>Performance History</TabsTrigger>
          <TabsTrigger value="compare" disabled={!selectedHorse}>Comparison</TabsTrigger>
          <TabsTrigger value="insight" disabled={!selectedHorse}>AI Insight</TabsTrigger>
          <TabsTrigger value="reports" disabled={!selectedHorse}>Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="horses" className="mt-4"><HorseProfiles horses={horses} onCreated={loadHorses} onSelect={(h)=>{setSelectedHorse(h); setTab("new");}} selectedId={selectedHorse?.id} onDeleted={(id)=>{ if (selectedHorse?.id===id) setSelectedHorse(null); loadHorses(); }}/></TabsContent>
        <TabsContent value="new" className="mt-4">{selectedHorse && <NewSession horse={selectedHorse} onCreated={()=>setTab("video")}/>}</TabsContent>
        <TabsContent value="video" className="mt-4">{selectedHorse && <VideoAnalysisTab horse={selectedHorse}/>}</TabsContent>
        <TabsContent value="gps" className="mt-4">{selectedHorse && <GpsTab horse={selectedHorse}/>}</TabsContent>
        <TabsContent value="history" className="mt-4">{selectedHorse && <HistoryTab horse={selectedHorse}/>}</TabsContent>
        <TabsContent value="compare" className="mt-4">{selectedHorse && <CompareTab horse={selectedHorse}/>}</TabsContent>
        <TabsContent value="insight" className="mt-4">{selectedHorse && <InsightTab horse={selectedHorse}/>}</TabsContent>
        <TabsContent value="reports" className="mt-4">{selectedHorse && <ReportsTab horse={selectedHorse}/>}</TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsTab/></TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function HorseProfiles({ horses, onCreated, onSelect, selectedId, onDeleted }: { horses: Horse[]; onCreated: () => void; onSelect: (h: Horse) => void; selectedId?: string; onDeleted?: (id: string) => void }) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string|null>(null);

  async function deleteHorse(h: Horse) {
    setDeletingId(h.id);
    const { data: sess } = await supabase.from("training_sessions").select("id").eq("horse_id", h.id);
    const sessionIds = (sess ?? []).map((s: any) => s.id);
    if (sessionIds.length) {
      await supabase.from("training_video_analyses").delete().in("session_id", sessionIds);
      await supabase.from("training_gps_reports" as any).delete().in("session_id", sessionIds);
      await supabase.from("training_sessions").delete().in("id", sessionIds);
    }
    const { error } = await supabase.from("training_horses").delete().eq("id", h.id);
    setDeletingId(null);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Horse profile deleted" });
    onDeleted?.(h.id);
  }
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Horse>>({ name: "", racing_code: "Flat", status: "In Training" });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name) return toast({ title: "Name required", variant: "destructive" });
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("training_horses").insert({ ...form, user_id: user!.id, name: form.name! });
    setSaving(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Horse added" });
    setCreating(false); setForm({ name: "", racing_code: "Flat", status: "In Training" });
    onCreated();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">{horses.length} horse{horses.length===1?"":"s"}</h3>
        <Button size="sm" onClick={()=>setCreating(v=>!v)}><Plus className="w-4 h-4 mr-1"/>Add Horse</Button>
      </div>

      {creating && (
        <Card><CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Name"><Input value={form.name??""} onChange={e=>setForm({...form, name:e.target.value})}/></Field>
          <Field label="Age"><Input type="number" value={form.age??""} onChange={e=>setForm({...form, age:Number(e.target.value)||null})}/></Field>
          <Field label="Sex"><Input value={form.sex??""} onChange={e=>setForm({...form, sex:e.target.value})}/></Field>
          <Field label="Breed"><Input value={form.breed??""} onChange={e=>setForm({...form, breed:e.target.value})}/></Field>
          <Field label="Sire"><Input value={form.sire??""} onChange={e=>setForm({...form, sire:e.target.value})}/></Field>
          <Field label="Dam"><Input value={form.dam??""} onChange={e=>setForm({...form, dam:e.target.value})}/></Field>
          <Field label="Dam Sire"><Input value={form.dam_sire??""} onChange={e=>setForm({...form, dam_sire:e.target.value})}/></Field>
          <Field label="Trainer"><Input value={form.trainer??""} onChange={e=>setForm({...form, trainer:e.target.value})}/></Field>
          <Field label="Owner"><Input value={form.owner??""} onChange={e=>setForm({...form, owner:e.target.value})}/></Field>
          <Field label="Stable"><Input value={form.stable??""} onChange={e=>setForm({...form, stable:e.target.value})}/></Field>
          <Field label="Country"><Input value={form.country??""} onChange={e=>setForm({...form, country:e.target.value})}/></Field>
          <Field label="Training Centre"><Input value={form.training_centre??""} onChange={e=>setForm({...form, training_centre:e.target.value})}/></Field>
          <Field label="Racing Code">
            <Select value={form.racing_code??"Flat"} onValueChange={v=>setForm({...form, racing_code:v})}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{["Flat","National Hunt","2YO in Training","Other"].map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status??"In Training"} onValueChange={v=>setForm({...form, status:v})}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{["In Training","Resting","Injured","Returning","Retired"].map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="md:col-span-2"><Field label="Notes"><Textarea value={form.notes??""} onChange={e=>setForm({...form, notes:e.target.value})}/></Field></div>
          <div className="md:col-span-2 flex gap-2 justify-end"><Button variant="outline" onClick={()=>setCreating(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin"/>}Save Horse</Button></div>
        </CardContent></Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {horses.map(h => (
          <Card key={h.id} className={`transition-colors hover:bg-muted/40 ${selectedId===h.id?"border-secondary":""}`}>
            <CardContent className="pt-4 space-y-1">
              <div className="flex justify-between items-start gap-2">
                <div className="cursor-pointer flex-1" onClick={()=>onSelect(h)}>
                  <h4 className="font-semibold text-sm">{h.name}</h4>
                  <p className="text-xs text-muted-foreground">{[h.age?`${h.age}yo`:null, h.sex, h.breed].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px]">{h.status}</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" disabled={deletingId===h.id} aria-label="Delete horse">
                        {deletingId===h.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Trash2 className="w-3.5 h-3.5"/>}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {h.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently remove this horse profile and ALL associated training sessions, video analyses and GPS reports. This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={()=>deleteHorse(h)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="cursor-pointer" onClick={()=>onSelect(h)}>
                <p className="text-xs text-muted-foreground">{[h.trainer && `Trainer: ${h.trainer}`, h.training_centre].filter(Boolean).join(" · ")}</p>
                <p className="text-[10px] text-muted-foreground">Sire: {h.sire ?? "—"} · Dam: {h.dam ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {horses.length === 0 && !creating && <p className="text-sm text-muted-foreground col-span-2">No horses yet. Click "Add Horse" to create the first profile.</p>}
      </div>
    </div>
  );
}

function NewSession({ horse, onCreated }: { horse: Horse; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<Session>>({ session_date: new Date().toISOString().slice(0,10), exercise_type: "Gallop", surface: "Turf" });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("training_sessions").insert({ ...form, horse_id: horse.id, user_id: user!.id });
    setSaving(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Session created", description: "Now upload the training video for AI analysis." });
    onCreated();
  }

  return (
    <Card><CardHeader><CardTitle className="text-sm">New Training Session — {horse.name}</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Date"><Input type="date" value={form.session_date??""} onChange={e=>setForm({...form, session_date:e.target.value})}/></Field>
        <Field label="Track / Gallop Location"><Input value={form.location??""} onChange={e=>setForm({...form, location:e.target.value})}/></Field>
        <Field label="Surface">
          <Select value={form.surface??""} onValueChange={v=>setForm({...form, surface:v})}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{["Turf","Dirt","Synthetic","Sand","Uphill Gallop","Woodchip","Other"].map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Distance (m)"><Input type="number" value={form.distance_m??""} onChange={e=>setForm({...form, distance_m:Number(e.target.value)||null})}/></Field>
        <Field label="Exercise">
          <Select value={form.exercise_type??""} onValueChange={v=>setForm({...form, exercise_type:v})}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{["Walk","Trot","Canter","Gallop","Fast Work","Breeze","Recovery Work"].map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Rider"><Input value={form.rider??""} onChange={e=>setForm({...form, rider:e.target.value})}/></Field>
        <Field label="Weather"><Input value={form.weather??""} onChange={e=>setForm({...form, weather:e.target.value})}/></Field>
        <Field label="Ground Condition"><Input value={form.ground_condition??""} onChange={e=>setForm({...form, ground_condition:e.target.value})}/></Field>
        <Field label="Body Temperature (°C)"><Input type="number" step="0.1" placeholder="e.g. 37.8" value={form.temperature_c??""} onChange={e=>setForm({...form, temperature_c:Number(e.target.value)||null})}/></Field>
        <Field label="Body Weight (kg)"><Input type="number" step="0.5" placeholder="e.g. 485" value={form.body_weight_kg??""} onChange={e=>setForm({...form, body_weight_kg:Number(e.target.value)||null})}/></Field>
        <Field label="Resting Heart Rate (bpm)"><Input type="number" placeholder="e.g. 32" value={form.resting_heart_rate??""} onChange={e=>setForm({...form, resting_heart_rate:Number(e.target.value)||null})}/></Field>
        <div className="md:col-span-2"><Field label="Trainer Notes"><Textarea value={form.trainer_notes??""} onChange={e=>setForm({...form, trainer_notes:e.target.value})}/></Field></div>
        <div className="md:col-span-2"><Field label="Vet Notes"><Textarea value={form.vet_notes??""} onChange={e=>setForm({...form, vet_notes:e.target.value})}/></Field></div>
        <div className="md:col-span-2 flex justify-end"><Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin"/>}Create Session</Button></div>
      </CardContent>
    </Card>
  );
}

function VideoAnalysisTab({ horse }: { horse: Horse }) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [progress, setProgress] = useState<{stage: string; pct: number}|null>(null);
  const [result, setResult] = useState<Analysis|null>(null);

  useEffect(() => { load(); }, [horse.id]);
  async function load() {
    const { data } = await supabase.from("training_sessions").select("*").eq("horse_id", horse.id).order("session_date",{ascending:false});
    setSessions((data??[]) as Session[]);
  }

  async function onFile(file: File) {
    if (!selected) return toast({ title: "Pick a session first", variant: "destructive" });
    try {
      setResult(null);
      setProgress({ stage: "Extracting frames…", pct: 15 });
      const frames = await extractFrames(file);
      setProgress({ stage: "Uploading video…", pct: 35 });
      const { data: { user } } = await supabase.auth.getUser();
      const path = `${user!.id}/${selected}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("training-videos").upload(path, file, { upsert: true });
      if (upErr) console.warn("video upload skipped", upErr.message);
      await supabase.from("training_sessions").update({ video_url: path }).eq("id", selected);
      setProgress({ stage: "Running AI biomechanics…", pct: 65 });
      const ctx = sessions.find(s=>s.id===selected);
      const { data, error } = await supabase.functions.invoke("training-video-analysis", {
        body: { session_id: selected, frames, context: { horse_name: horse.name, exercise_type: ctx?.exercise_type, surface: ctx?.surface, distance_m: ctx?.distance_m, notes: ctx?.trainer_notes } },
      });
      if (error) throw error;
      setProgress({ stage: "Done", pct: 100 });
      setResult(data.analysis as Analysis);
      toast({ title: "Analysis complete" });
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setTimeout(() => setProgress(null), 1500);
    }
  }

  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-4 space-y-3">
        <div className="bg-muted/40 border border-border rounded-lg p-3 text-xs space-y-1">
          <p className="font-semibold flex items-center gap-1"><Video className="w-4 h-4"/>For best AI accuracy, please upload a high-quality training video.</p>
          <ul className="list-disc ml-5 text-muted-foreground space-y-0.5">
            <li>1080p or higher · 60 FPS preferred</li>
            <li>Full horse visible · side-on angle preferred</li>
            <li>Stable camera position · good lighting</li>
            <li>Minimal motion blur · avoid heavy zoom or shaky footage</li>
            <li>Avoid multiple horses overlapping</li>
          </ul>
          <p className="text-muted-foreground">The AI analysis depends on the quality and clarity of the video frames.</p>
        </div>

        <Field label="Session">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue placeholder="Pick a session"/></SelectTrigger>
            <SelectContent>{sessions.map(s=>(<SelectItem key={s.id} value={s.id}>{s.session_date} · {s.exercise_type} · {s.surface}</SelectItem>))}</SelectContent>
          </Select>
        </Field>

        <div>
          <Label className="text-xs">Upload Training Video</Label>
          <Input type="file" accept="video/*" onChange={e=>e.target.files?.[0] && onFile(e.target.files[0])}/>
        </div>

        {progress && <div><p className="text-xs text-muted-foreground mb-1">{progress.stage}</p><Progress value={progress.pct}/></div>}
      </CardContent></Card>

      {result && <AnalysisResultCard analysis={result}/>}
    </div>
  );
}

function AnalysisResultCard({ analysis }: { analysis: Analysis }) {
  const scores = analysis.scores ?? {};
  const metrics = analysis.metrics ?? {};
  const scoreKeys: [string, string][] = [
    ["training_performance","Training Performance"],
    ["race_readiness","Race Readiness"],
    ["soundness_index","Soundness Index"],
    ["mechanical_efficiency","Mechanical Efficiency"],
    ["recovery","Recovery"],
    ["fatigue_risk","Fatigue Risk"],
    ["consistency","Consistency"],
  ];
  return (
    <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><Gauge className="w-4 h-4 text-secondary"/>Analysis Result</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {scoreKeys.map(([k,label])=>(
            <div key={k} className="border border-border rounded p-2">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="text-lg font-bold">{scores[k] ?? "—"}<span className="text-xs text-muted-foreground">/100</span></p>
            </div>
          ))}
          <div className="border border-border rounded p-2">
            <p className="text-[10px] text-muted-foreground">Development</p>
            <p className="text-sm font-semibold">{scores.development_curve ?? "—"}</p>
          </div>
        </div>
        {analysis.ai_narrative && <div className="text-xs whitespace-pre-wrap bg-muted/30 rounded p-3 border border-border">{analysis.ai_narrative}</div>}
        {Array.isArray(analysis.recommendations) && analysis.recommendations.length>0 && (
          <div><p className="text-xs font-semibold mb-1">Recommendations</p>
            <ul className="list-disc ml-5 text-xs text-muted-foreground space-y-1">{analysis.recommendations.map((r:string,i:number)=><li key={i}>{r}</li>)}</ul>
          </div>
        )}
        <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">View raw biomechanical metrics</summary>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mt-2">{Object.entries(metrics).map(([k,v])=>(<div key={k} className="flex justify-between border-b border-border/40 py-0.5"><span className="text-muted-foreground">{k}</span><span className="font-mono">{(v as any) ?? "—"}</span></div>))}</div>
        </details>
      </CardContent>
    </Card>
  );
}

function GpsTab({ horse }: { horse: Horse }) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState("");
  const [provider, setProvider] = useState("Arioneo");
  const [busy, setBusy] = useState(false);
  const [latest, setLatest] = useState<Gps|null>(null);

  useEffect(() => { (async ()=>{ const { data } = await supabase.from("training_sessions").select("*").eq("horse_id", horse.id).order("session_date",{ascending:false}); setSessions((data??[]) as Session[]); })(); }, [horse.id]);

  async function handle(file: File) {
    if (!selected) return toast({ title: "Pick a session", variant: "destructive" });
    setBusy(true);
    try {
      const content = await file.text();
      const { data, error } = await supabase.functions.invoke("training-gps-parse", { body: { session_id: selected, provider, content, filename: file.name } });
      if (error) throw error;
      setLatest(data.report as Gps);
      toast({ title: "GPS report parsed" });
    } catch (e: any) { toast({ title: "Parse failed", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  }

  return (
    <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><Heart className="w-4 h-4 text-secondary"/>GPS & Wearable Data Upload</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Upload CSV / TXT exports from Arioneo, Equimetre, Equimetrics, E-Trakka, StrideMASTER or generic trackers. Key:value or comma-separated formats are auto-detected.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Session"><Select value={selected} onValueChange={setSelected}><SelectTrigger><SelectValue placeholder="Pick session"/></SelectTrigger><SelectContent>{sessions.map(s=>(<SelectItem key={s.id} value={s.id}>{s.session_date} · {s.exercise_type}</SelectItem>))}</SelectContent></Select></Field>
          <Field label="Provider"><Select value={provider} onValueChange={setProvider}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Arioneo","Equimetre","Equimetrics","E-Trakka","StrideMASTER","Other"].map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></Field>
        </div>
        <Input type="file" accept=".csv,.txt,.tsv,.json" disabled={busy} onChange={e=>e.target.files?.[0] && handle(e.target.files[0])}/>
        {busy && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin"/>Parsing…</div>}
        {latest && (
          <div className="border border-border rounded p-3 text-xs">
            <p className="font-semibold mb-1">Parsed metrics</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1">{Object.entries(latest.metrics).map(([k,v])=>(<div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-mono">{String(v)}</span></div>))}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryTab({ horse }: { horse: Horse }) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [filter, setFilter] = useState("90");

  useEffect(() => { (async () => {
    const { data: sess } = await supabase.from("training_sessions").select("id").eq("horse_id", horse.id);
    const ids = (sess??[]).map((s:any)=>s.id);
    if (!ids.length) { setAnalyses([]); return; }
    const { data } = await supabase.from("training_video_analyses").select("*").in("session_id", ids).order("created_at",{ascending:true});
    setAnalyses((data??[]) as Analysis[]);
  })(); }, [horse.id]);

  const filtered = useMemo(() => {
    if (filter === "all") return analyses;
    const days = parseInt(filter);
    const cutoff = Date.now() - days*86400000;
    return analyses.filter(a => new Date(a.created_at).getTime() >= cutoff);
  }, [analyses, filter]);

  const chartData = filtered.map(a => ({
    date: new Date(a.created_at).toLocaleDateString(),
    training: a.scores?.training_performance ?? null,
    readiness: a.scores?.race_readiness ?? null,
    soundness: a.scores?.soundness_index ?? null,
    efficiency: a.scores?.mechanical_efficiency ?? null,
    recovery: a.scores?.recovery ?? null,
    fatigue: a.scores?.fatigue_risk ?? null,
  }));

  return (
    <>
    <Card><CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-secondary"/>Performance History</CardTitle>
      <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-40"><SelectValue/></SelectTrigger><SelectContent>{[["7","Last 7 days"],["30","Last 30 days"],["90","Last 90 days"],["180","Last season"],["all","Full career"]].map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
    </CardHeader>
      <CardContent>
        {chartData.length === 0 ? <p className="text-sm text-muted-foreground">No analyses yet for this period.</p> : (
          <div className="h-72"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/><XAxis dataKey="date" tick={{fontSize:10}}/><YAxis domain={[0,100]} tick={{fontSize:10}}/><Tooltip/><Legend wrapperStyle={{fontSize:11}}/>
              <Line type="monotone" dataKey="training" stroke="hsl(var(--secondary))" strokeWidth={2}/>
              <Line type="monotone" dataKey="readiness" stroke="hsl(var(--primary))" strokeWidth={2}/>
              <Line type="monotone" dataKey="soundness" stroke="#22c55e" strokeWidth={2}/>
              <Line type="monotone" dataKey="efficiency" stroke="#3b82f6" strokeWidth={2}/>
              <Line type="monotone" dataKey="recovery" stroke="#eab308" strokeWidth={2}/>
              <Line type="monotone" dataKey="fatigue" stroke="#ef4444" strokeWidth={2}/>
            </LineChart>
          </ResponsiveContainer></div>
        )}
      </CardContent>
    </Card>
    {chartData.length > 0 && (
      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><Gauge className="w-4 h-4 text-secondary"/>Latest Scores — Radar</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%">
              <RadarChart data={Object.entries((filtered[filtered.length-1]?.scores)||{}).filter(([k,v])=>typeof v==="number").slice(0,8).map(([k,v])=>({metric:k.replace(/_/g," "), value:v as number}))}>
                <PolarGrid stroke="hsl(var(--border))"/><PolarAngleAxis dataKey="metric" tick={{fontSize:10}}/><PolarRadiusAxis domain={[0,100]} tick={{fontSize:9}}/>
                <Radar dataKey="value" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.35}/>
                <Tooltip/>
              </RadarChart>
            </ResponsiveContainer></div>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-secondary"/>Training Score Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="trGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.55}/><stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0.05}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/><XAxis dataKey="date" tick={{fontSize:10}}/><YAxis domain={[0,100]} tick={{fontSize:10}}/><Tooltip/>
                <Area type="monotone" dataKey="training" stroke="hsl(var(--secondary))" fill="url(#trGrad)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer></div>
          </CardContent>
        </Card>
      </div>
    )}
    </>
  );
}

function CompareTab({ horse }: { horse: Horse }) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => { (async () => {
    const { data: sess } = await supabase.from("training_sessions").select("id").eq("horse_id", horse.id);
    const ids = (sess??[]).map((s:any)=>s.id);
    if (!ids.length) return;
    const { data } = await supabase.from("training_video_analyses").select("*").in("session_id", ids).order("created_at",{ascending:false});
    setAnalyses((data??[]) as Analysis[]);
  })(); }, [horse.id]);

  const rows = picked.map(id => analyses.find(a => a.id===id)!).filter(Boolean);
  const metricKeys = ["training_performance","race_readiness","soundness_index","mechanical_efficiency","recovery","fatigue_risk","consistency"];

  return (
    <Card><CardHeader><CardTitle className="text-sm">Session Comparison</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">{analyses.map(a => (
          <Button key={a.id} size="sm" variant={picked.includes(a.id)?"default":"outline"} onClick={()=>setPicked(p => p.includes(a.id) ? p.filter(x=>x!==a.id) : [...p,a.id])}>{new Date(a.created_at).toLocaleDateString()}</Button>
        ))}</div>
        {rows.length > 0 && (
          <>
          <div className="h-64 mb-3"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={metricKeys.map(k => { const o: any = { metric: k.replace(/_/g," ") }; rows.forEach(r => { o[new Date(r.created_at).toLocaleDateString()] = typeof r.scores?.[k] === "number" ? r.scores[k] : 0; }); return o; })}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/><XAxis dataKey="metric" tick={{fontSize:9}} interval={0} angle={-15} textAnchor="end" height={50}/><YAxis domain={[0,100]} tick={{fontSize:10}}/><Tooltip/><Legend wrapperStyle={{fontSize:11}}/>
              {rows.map((r,i) => <Bar key={r.id} dataKey={new Date(r.created_at).toLocaleDateString()} fill={["hsl(var(--secondary))","hsl(var(--primary))","#22c55e","#3b82f6","#eab308","#ef4444"][i%6]}/>)}
            </BarChart>
          </ResponsiveContainer></div>
          <div className="overflow-x-auto"><table className="w-full text-xs border-collapse">
            <thead><tr className="border-b border-border"><th className="text-left p-2">Metric</th>{rows.map(r=><th key={r.id} className="text-left p-2">{new Date(r.created_at).toLocaleDateString()}</th>)}</tr></thead>
            <tbody>{metricKeys.map(k => (
              <tr key={k} className="border-b border-border/40"><td className="p-2 text-muted-foreground">{k.replace(/_/g, " ")}</td>{rows.map(r=><td key={r.id} className="p-2 font-mono">{r.scores?.[k] ?? "—"}</td>)}</tr>
            ))}</tbody>
          </table></div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ReportsTab({ horse }: { horse: Horse }) {
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  useEffect(() => { (async () => {
    const { data: sess } = await supabase.from("training_sessions").select("id").eq("horse_id", horse.id);
    const ids = (sess??[]).map((s:any)=>s.id);
    if (!ids.length) return;
    const { data: sessFull } = await supabase.from("training_sessions").select("*").eq("horse_id", horse.id).order("session_date",{ascending:true});
    setSessions((sessFull??[]) as Session[]);
    const { data } = await supabase.from("training_video_analyses").select("*").in("session_id", ids).order("created_at",{ascending:false});
    setAnalyses((data??[]) as Analysis[]);
  })(); }, [horse.id]);

  function exportCsv() {
    const csv = csvFor(analyses);
    if (!csv) return toast({ title: "No data to export" });
    download(`${horse.name.replace(/\s+/g,"_")}-training.csv`, csv);
  }
  function exportJson() {
    download(`${horse.name.replace(/\s+/g,"_")}-training.json`, JSON.stringify({ horse, analyses }, null, 2), "application/json");
  }
  function printableReport() {
    if (!analyses.length) return toast({ title: "No analyses yet", description: "Analyse at least one training video before exporting the PDF report." });
    const ordered = [...analyses].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    downloadTrainingReportPDF(horse, ordered, sessions);
    toast({ title: "Report ready", description: "Premium PDF downloaded." });
  }

  return (
    <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-secondary"/>Reports</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Generate full horse performance reports including profile, every analysed session, scores, AI interpretation and recommendations.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={printableReport}><Download className="w-4 h-4 mr-1"/>Full Performance Report (PDF)</Button>
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-1"/>Scores & Metrics (CSV)</Button>
          <Button size="sm" variant="outline" onClick={exportJson}><Download className="w-4 h-4 mr-1"/>Raw Data (JSON)</Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Reports use the same BloodstockAI premium layout as the Sales Catalogs Analyzed module — cover page, branded header/footer, score bars, session details, AI interpretation and recommendations.</p>
      </CardContent>
    </Card>
  );
}

function SettingsTab() {
  return (
    <Card><CardHeader><CardTitle className="text-sm">Training Analysis Settings</CardTitle></CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-2">
        <p>All analyses are stored privately under your account and used to build each horse's longitudinal performance database.</p>
        <p>AI interpretation is informational only and is never a veterinary diagnosis. Persistent indicators should be reviewed by a qualified veterinarian or farrier.</p>
      </CardContent>
    </Card>
  );
}

function InsightTab({ horse }: { horse: Horse }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<any|null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("training_sessions").select("*").eq("horse_id", horse.id).order("session_date", { ascending: true });
    setSessions((data ?? []) as Session[]);
  })(); }, [horse.id]);

  async function generate() {
    setLoading(true); setInsight(null);
    try {
      const { data, error } = await supabase.functions.invoke("training-insight", { body: { horse_id: horse.id } });
      if (error) throw error;
      setInsight(data.insight);
      toast({ title: "Insight ready" });
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }

  const vitalsData = sessions.filter(s => s.temperature_c || s.body_weight_kg || s.resting_heart_rate)
    .map(s => ({ date: s.session_date, temperature: s.temperature_c, weight: s.body_weight_kg, hr: s.resting_heart_rate }));

  return (
    <div className="space-y-4">
      {vitalsData.length > 0 && (
        <div className="grid md:grid-cols-3 gap-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1"><Thermometer className="w-3 h-3 text-secondary"/>Temperature (°C)</CardTitle></CardHeader>
            <CardContent><div className="h-32"><ResponsiveContainer width="100%" height="100%"><LineChart data={vitalsData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/><XAxis dataKey="date" tick={{fontSize:9}}/><YAxis domain={[36,40]} tick={{fontSize:9}}/><Tooltip/><Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2}/></LineChart></ResponsiveContainer></div></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1"><Scale className="w-3 h-3 text-secondary"/>Body Weight (kg)</CardTitle></CardHeader>
            <CardContent><div className="h-32"><ResponsiveContainer width="100%" height="100%"><LineChart data={vitalsData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/><XAxis dataKey="date" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}} domain={["auto","auto"]}/><Tooltip/><Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2}/></LineChart></ResponsiveContainer></div></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-1"><Heart className="w-3 h-3 text-secondary"/>Resting HR (bpm)</CardTitle></CardHeader>
            <CardContent><div className="h-32"><ResponsiveContainer width="100%" height="100%"><LineChart data={vitalsData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/><XAxis dataKey="date" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}} domain={["auto","auto"]}/><Tooltip/><Line type="monotone" dataKey="hr" stroke="#22c55e" strokeWidth={2}/></LineChart></ResponsiveContainer></div></CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-secondary"/>BloodstockAI Training Insight — {horse.name}</CardTitle>
          <p className="text-[11px] text-muted-foreground">Elite-trainer level briefing built from this horse's profile, vitals, recent sessions and biomechanics scores. Includes a tailored nutrition plan and a pathway to G1 condition.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" onClick={generate} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin"/> : null}Generate AI Insight</Button>

          {insight && (
            <div className="space-y-4 text-sm">
              {insight.physiological_read && (<div className="bg-muted/30 border border-border rounded p-3"><p className="text-xs font-semibold mb-1 text-secondary">Physiological Read</p><p className="text-xs whitespace-pre-wrap">{insight.physiological_read}</p></div>)}

              {Array.isArray(insight.training_strategy) && (<div><p className="text-xs font-semibold mb-1">Training Strategy</p><ul className="list-disc ml-5 text-xs text-muted-foreground space-y-1">{insight.training_strategy.map((s:string,i:number)=><li key={i}>{s}</li>)}</ul></div>)}

              {insight.nutrition_plan && (
                <div className="border border-border rounded p-3 space-y-2">
                  <p className="text-xs font-semibold text-secondary">Nutrition Plan</p>
                  {insight.nutrition_plan.focus && <p className="text-xs italic">{insight.nutrition_plan.focus}</p>}
                  {Array.isArray(insight.nutrition_plan.daily_feed) && (<div><p className="text-[11px] font-semibold">Daily Feed</p><ul className="list-disc ml-5 text-xs text-muted-foreground">{insight.nutrition_plan.daily_feed.map((s:string,i:number)=><li key={i}>{s}</li>)}</ul></div>)}
                  {Array.isArray(insight.nutrition_plan.pre_work) && insight.nutrition_plan.pre_work.length>0 && (<div><p className="text-[11px] font-semibold">Pre-Work</p><ul className="list-disc ml-5 text-xs text-muted-foreground">{insight.nutrition_plan.pre_work.map((s:string,i:number)=><li key={i}>{s}</li>)}</ul></div>)}
                  {Array.isArray(insight.nutrition_plan.post_work) && insight.nutrition_plan.post_work.length>0 && (<div><p className="text-[11px] font-semibold">Post-Work</p><ul className="list-disc ml-5 text-xs text-muted-foreground">{insight.nutrition_plan.post_work.map((s:string,i:number)=><li key={i}>{s}</li>)}</ul></div>)}
                </div>
              )}

              {Array.isArray(insight.vitals_watchlist) && insight.vitals_watchlist.length>0 && (<div><p className="text-xs font-semibold mb-1">Vitals Watchlist (next 7–14 days)</p><ul className="list-disc ml-5 text-xs text-muted-foreground space-y-1">{insight.vitals_watchlist.map((s:string,i:number)=><li key={i}>{s}</li>)}</ul></div>)}

              {Array.isArray(insight.red_flags) && insight.red_flags.length>0 && (<div className="border border-destructive/40 bg-destructive/5 rounded p-3"><p className="text-xs font-semibold mb-1 text-destructive">Red Flags</p><ul className="list-disc ml-5 text-xs space-y-1">{insight.red_flags.map((s:string,i:number)=><li key={i}>{s}</li>)}</ul></div>)}

              {insight.g1_pathway && (<div className="bg-secondary/10 border border-secondary/30 rounded p-3"><p className="text-xs font-semibold mb-1 text-secondary">G1 Pathway</p><p className="text-xs whitespace-pre-wrap">{insight.g1_pathway}</p></div>)}

              <p className="text-[10px] text-muted-foreground italic">Informational only — never a veterinary diagnosis. Always confirm clinical signs with a qualified veterinarian.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
