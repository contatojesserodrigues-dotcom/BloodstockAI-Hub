import { useState, useRef, useCallback } from "react";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/PaywallModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Camera, Video, Upload, Loader2, FileText, Download, Search, X, Plus } from "lucide-react";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { UpgradeModal } from "@/components/UpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { annotateBreezFrames, type FrameAnnotation } from "@/utils/breezeFrameAnnotation";
import { annotateVisualFrames, BIOMECHANIC_LEGEND } from "@/utils/visualBiomechanicsAnnotation";
import { generateVisualAnalysisPDF } from "@/utils/visualAnalysisPdfReport";
import { VideoPoseViewer } from "@/components/dashboard/VideoPoseViewer";
import type { PoseFrame } from "@/utils/poseAngles";
import { Activity, Loader2 as Loader2Icon } from "lucide-react";

const ANALYSIS_TYPES = [
  { id: "conformation", label: "Conformation Assessment" },
  { id: "musculature", label: "Musculature & Body Condition" },
  { id: "biomechanics", label: "Biomechanics & Movement" },
  { id: "behaviour", label: "Behaviour & Temperament" },
  { id: "gait", label: "Gait Analysis" },
  { id: "full", label: "Full Expert Assessment (all of the above)" },
];

const HOOF_LABELS = ["Left Front (LF)", "Right Front (RF)", "Left Hind (LH)", "Right Hind (RH)"];

// ═══ 8-FRAME EXTRACTION FOR BREEZE ═══
async function extractBreezeFrames(videoFile: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!duration || duration <= 0) { URL.revokeObjectURL(url); reject(new Error("Invalid video")); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Canvas not supported")); return; }
      const frames: string[] = [];
      const timestamps = [
        duration * 0.05, duration * 0.15, duration * 0.25, duration * 0.35,
        duration * 0.50, duration * 0.65, duration * 0.80, duration * 0.95,
      ];
      let idx = 0;
      video.onseeked = () => {
        canvas.width = Math.min(video.videoWidth, 1280);
        canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.92));
        idx++;
        if (idx < timestamps.length) {
          video.currentTime = timestamps[idx];
        } else {
          URL.revokeObjectURL(url);
          resolve(frames);
        }
      };
      video.currentTime = timestamps[0];
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load video")); };
  });
}

// ═══ 6-FRAME EXTRACTION FOR WALK/GENERAL ═══
async function extractVideoFrames(videoFile: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!duration || duration <= 0) { URL.revokeObjectURL(url); reject(new Error("Invalid video")); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Canvas not supported")); return; }
      const frames: string[] = [];
      const timestamps = [0, duration * 0.2, duration * 0.4, duration * 0.6, duration * 0.8, Math.max(duration * 0.99, 0)];
      let idx = 0;
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        frames.push(canvas.toDataURL("image/jpeg", 0.8));
        idx++;
        if (idx < timestamps.length) video.currentTime = timestamps[idx];
        else { URL.revokeObjectURL(url); resolve(frames); }
      };
      video.currentTime = timestamps[0];
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load video")); };
  });
}

export const DashboardVisualAnalysisLegacy = () => {
  const [horseName, setHorseName] = useState("");
  const [sire, setSire] = useState("");
  const [dam, setDam] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"photo" | "video" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["full"]);
  const [analysing, setAnalysing] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; percent: number } | null>(null);
  const [result, setResult] = useState<any>(null);
  const [annotatedFrames, setAnnotatedFrames] = useState<FrameAnnotation[]>([]);
  const [rawFrames, setRawFrames] = useState<string[]>([]);
  const [poseFrames, setPoseFrames] = useState<PoseFrame[]>([]);
  const [poseLoading, setPoseLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Analysis mode: "walk" or "gallop"
  const [analysisMode, setAnalysisMode] = useState<"walk" | "gallop">("walk");

  // Hoof analysis state
  const [includeHoofAnalysis, setIncludeHoofAnalysis] = useState(false);
  const [hoofPhotos, setHoofPhotos] = useState<(File | null)[]>([null, null, null, null]);
  const [hoofPreviews, setHoofPreviews] = useState<(string | null)[]>([null, null, null, null]);
  const hoofInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const { user } = useAuth();
  const { isPaidPlan } = useCredits();
  const access = useFeatureAccess();
  const { toast } = useToast();
  const { gate, grantRetry, paywallOpen, setPaywallOpen, paywallType } = usePaywall();

  const toggleType = (id: string) => {
    if (id === "full") {
      setSelectedTypes(["full"]);
      return;
    }
    setSelectedTypes(prev => {
      const filtered = prev.filter(t => t !== "full");
      return filtered.includes(id) ? filtered.filter(t => t !== id) : [...filtered, id];
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    classifyAndSetFile(file);
  };

  const classifyAndSetFile = (file: File) => {
    const isVideo = [".mp4", ".mov"].some(ext => file.name.toLowerCase().endsWith(ext));
    const isImage = [".jpg", ".jpeg", ".png", ".webp"].some(ext => file.name.toLowerCase().endsWith(ext));
    if (isVideo) {
      if (file.size > 150 * 1024 * 1024) {
        toast({ title: "File too large", description: "Video max size is 150MB", variant: "destructive" });
        return;
      }
      setMediaType("video");
    } else if (isImage) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Photo max size is 10MB", variant: "destructive" });
        return;
      }
      setMediaType("photo");
    } else {
      toast({ title: "Unsupported format", description: "Please upload JPG, PNG, WebP, MP4 or MOV", variant: "destructive" });
      return;
    }
    setMediaFile(file);
  };

  const handleHoofPhotoSelect = (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Image only", description: "Upload JPG, PNG or WebP photos of hooves", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Photo max size is 10MB", variant: "destructive" });
      return;
    }
    const newPhotos = [...hoofPhotos];
    newPhotos[index] = file;
    setHoofPhotos(newPhotos);

    const reader = new FileReader();
    reader.onload = (e) => {
      const newPreviews = [...hoofPreviews];
      newPreviews[index] = e.target?.result as string;
      setHoofPreviews(newPreviews);
    };
    reader.readAsDataURL(file);
  };

  const removeHoofPhoto = (index: number) => {
    const newPhotos = [...hoofPhotos];
    newPhotos[index] = null;
    setHoofPhotos(newPhotos);
    const newPreviews = [...hoofPreviews];
    newPreviews[index] = null;
    setHoofPreviews(newPreviews);
  };

  const handleRunAnalysis = async () => {
    if (!mediaFile) return;
    if (gate("visual")) return;

    setAnalysing(true);
    setResult(null);
    setAnnotatedFrames([]);
    setRawFrames([]);
    setPoseFrames([]);

    try {
      let requestBody: Record<string, any> = {};
      let extractedFrames: string[] = [];

      if (analysisMode === "gallop") {
        // ═══ GALLOP & BREEZE MODE ═══
        if (mediaType === "video") {
          setProgress({ stage: "Extracting 8 key gallop frames...", percent: 10 });
          const frames = await extractBreezeFrames(mediaFile);
          setRawFrames(frames);
          extractedFrames = frames;
          setProgress({ stage: "Generating biomechanical annotations...", percent: 20 });
          try {
            const annotated = await annotateBreezFrames(frames);
            setAnnotatedFrames(annotated);
          } catch (e) { console.warn("Frame annotation failed:", e); }
          setProgress({ stage: `Analysing ${frames.length} gallop frames with AI Vision...`, percent: 30 });
          requestBody = {
            type: "breeze_video_analysis",
            video_frames: frames,
            horse_name: horseName || undefined,
            sire: sire || undefined,
            dam: dam || undefined,
          };
        } else {
          // Photo for gallop analysis
          setProgress({ stage: "📤 Uploading photo...", percent: 10 });
          const filePath = `visual-analysis/${user?.id}/${Date.now()}_${mediaFile.name}`;
          const { error: uploadError } = await supabase.storage.from("pdf-uploads").upload(filePath, mediaFile);
          if (uploadError) throw uploadError;
          // Annotate the single photo for visual overlay
          try {
            const photoDataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(mediaFile);
            });
            setRawFrames([photoDataUrl]);
            extractedFrames = [photoDataUrl];
            const annotated = await annotateBreezFrames([photoDataUrl]);
            setAnnotatedFrames(annotated);
          } catch (e) { console.warn("Photo annotation failed:", e); }
          setProgress({ stage: "AI analysing gallop mechanics...", percent: 40 });
          requestBody = {
            type: "breeze_video_analysis",
            file_path: filePath,
            horse_name: horseName || undefined,
            sire: sire || undefined,
            dam: dam || undefined,
          };
        }
      } else {
        // ═══ WALK & POSTURE MODE ═══
        // Convert hoof photos to base64
        let hoofBase64: string[] = [];
        if (includeHoofAnalysis) {
          const validHoofPhotos = hoofPhotos.filter((p): p is File => p !== null);
          for (const photo of validHoofPhotos) {
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(photo);
            });
            hoofBase64.push(base64);
          }
        }

        if (mediaType === "video") {
          setProgress({ stage: "Extracting frames from video...", percent: 10 });
          const frames = await extractVideoFrames(mediaFile);
          setRawFrames(frames);
          extractedFrames = frames;
          setProgress({ stage: "Generating biomechanical annotations...", percent: 20 });
          try {
            const annotated = await annotateVisualFrames(frames, {});
            setAnnotatedFrames(annotated as any);
          } catch (e) { console.warn("Frame annotation failed:", e); }
          setProgress({ stage: `Analysing ${frames.length} frames for posture & alignment...`, percent: 30 });
          requestBody = {
            type: "walk_posture_analysis",
            video_frames: frames,
            horse_name: horseName || undefined,
            sire: sire || undefined,
            dam: dam || undefined,
            include_hoof_analysis: includeHoofAnalysis && hoofBase64.length > 0,
            hoof_photos: hoofBase64.length > 0 ? hoofBase64 : undefined,
          };
        } else {
          setProgress({ stage: "📤 Uploading photo...", percent: 10 });
          const filePath = `visual-analysis/${user?.id}/${Date.now()}_${mediaFile.name}`;
          const { error: uploadError } = await supabase.storage.from("pdf-uploads").upload(filePath, mediaFile);
          if (uploadError) throw uploadError;
          try {
            const photoDataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(mediaFile);
            });
            setRawFrames([photoDataUrl]);
            extractedFrames = [photoDataUrl];
            const annotated = await annotateVisualFrames([photoDataUrl], {});
            setAnnotatedFrames(annotated as any);
          } catch (e) { console.warn("Photo annotation failed:", e); }
          setProgress({ stage: "AI analysing posture & alignment...", percent: 40 });
          requestBody = {
            type: "walk_posture_analysis",
            file_path: filePath,
            horse_name: horseName || undefined,
            sire: sire || undefined,
            dam: dam || undefined,
            include_hoof_analysis: includeHoofAnalysis && hoofBase64.length > 0,
            hoof_photos: hoofBase64.length > 0 ? hoofBase64 : undefined,
          };
        }
      }

      const { data, error } = await supabase.functions.invoke("ai-analysis", {
        body: requestBody,
      });

      if (error) {
        const errorMsg = typeof error === "object" && error.message ? error.message : String(error);
        if (errorMsg.includes("Rate limit") || errorMsg.includes("429")) {
          throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        }
        if (errorMsg.includes("402") || errorMsg.includes("credits")) {
          throw new Error("AI credits exhausted. Please check your account.");
        }
        throw error;
      }

      if (data?.error) throw new Error(data.error);

      setProgress({ stage: "✅ Analysis complete!", percent: 100 });
      setResult(data);

      // Re-annotate frames with the AI's biomechanical scores overlaid on anatomical zones
      try {
        const sc = data?.scores || {};
        if (extractedFrames.length > 0 && Object.keys(sc).length > 0) {
          const annotated = await annotateVisualFrames(extractedFrames, {
            posture: sc.posture,
            forelimb_alignment: sc.forelimb_alignment,
            hindlimb_alignment: sc.hindlimb_alignment,
            gait: sc.gait,
            hoof_health: sc.hoof_health,
            health_indicators: sc.health_indicators,
            overall: sc.overall,
          });
          setAnnotatedFrames(annotated as any);
        }
      } catch (e) { console.warn("Re-annotation with scores failed:", e); }

      setTimeout(() => setProgress(null), 2000);
      toast({ title: "Visual Analysis Complete!", description: `${horseName || "Horse"} has been analysed.` });
    } catch (err: any) {
      grantRetry("visual");
      toast({ title: "Analysis Failed", description: err.message || "Error running visual analysis. Please try again.", variant: "destructive" });
      setProgress(null);
    } finally {
      setAnalysing(false);
    }
  };

  const scores = result?.scores || {};
  const hasScores = Object.keys(scores).length > 0;

  return (
    <div className="space-y-6">
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Camera className="w-6 h-6 text-secondary" />
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
            Visual Analysis
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          AI-powered conformation, biomechanics and behaviour analysis.
          Upload a photo or video of any horse for instant expert assessment.
        </p>
      </div>

      {/* Section 1 — Horse Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horse Details</CardTitle>
          <CardDescription>Optional — enriches the analysis with pedigree context</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Horse Name or Lot Number</Label>
              <Input value={horseName} onChange={e => setHorseName(e.target.value)} placeholder="e.g. Frankel or Lot 123" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sire (optional)</Label>
              <Input value={sire} onChange={e => setSire(e.target.value)} placeholder="e.g. Galileo" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dam (optional)</Label>
              <Input value={dam} onChange={e => setDam(e.target.value)} placeholder="e.g. Kind" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Upload Media */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Upload Media</CardTitle>
              <CardDescription>Upload a photo or video for AI analysis</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
              isDragging ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/50"
            }`}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
          >
            {mediaFile ? (
              <div className="space-y-2">
                {mediaType === "photo" ? <Camera className="w-10 h-10 mx-auto text-secondary" /> : <Video className="w-10 h-10 mx-auto text-secondary" />}
                <p className="text-sm font-medium">{mediaFile.name}</p>
                <p className="text-xs text-muted-foreground">{(mediaFile.size / 1024 / 1024).toFixed(2)} MB • {mediaType}</p>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setMediaFile(null); setMediaType(null); }}>
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop your photo or video here</p>
                <div className="flex items-center justify-center gap-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && classifyAndSetFile(e.target.files[0])}
                    />
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:border-secondary/50 transition-colors">
                      <Camera className="w-4 h-4" /> Upload Photo
                    </span>
                  </label>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".mp4,.mov"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && classifyAndSetFile(e.target.files[0])}
                    />
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:border-secondary/50 transition-colors">
                      <Video className="w-4 h-4" /> Upload Video
                    </span>
                  </label>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Photo: JPG, PNG, WebP — max 10MB &nbsp;|&nbsp; Video: MP4, MOV — max 150MB
                </p>
                <p className="text-[10px] text-muted-foreground italic">
                  For best results: full body side-on photo, or video of horse walking/trotting/galloping
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══ ANALYSIS MODE SELECTOR ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Analysis Mode</CardTitle>
          <CardDescription>Choose the type of movement analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={analysisMode} onValueChange={(v) => setAnalysisMode(v as "walk" | "gallop")} className="space-y-3">
            <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
              analysisMode === "walk" ? "border-secondary bg-secondary/10" : "border-border hover:border-secondary/30"
            }`}>
              <RadioGroupItem value="walk" className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">Walk & Posture Analysis</p>
                <p className="text-xs text-muted-foreground">Conformation, alignment, hoof structure, gait assessment</p>
              </div>
            </label>
            <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
              analysisMode === "gallop" ? "border-secondary bg-secondary/10" : "border-border hover:border-secondary/30"
            }`}>
              <RadioGroupItem value="gallop" className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">Gallop & Breeze Analysis</p>
                <p className="text-xs text-muted-foreground">Biomechanics, stride metrics, speed estimation</p>
              </div>
            </label>
          </RadioGroup>

          {/* ═══ HOOF ANALYSIS SUB-OPTION (Walk mode only) ═══ */}
          {analysisMode === "walk" && (
            <div className="mt-4 space-y-3">
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                includeHoofAnalysis ? "border-secondary bg-secondary/10" : "border-border hover:border-secondary/30"
              }`}>
                <Checkbox
                  checked={includeHoofAnalysis}
                  onCheckedChange={(checked) => setIncludeHoofAnalysis(checked === true)}
                />
                <div>
                  <p className="text-sm font-medium">Include Hoof Structure Analysis</p>
                  <p className="text-xs text-muted-foreground">Upload close-up photos of hooves for specialist assessment</p>
                </div>
              </label>

              {includeHoofAnalysis && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-2">
                  {HOOF_LABELS.map((label, idx) => (
                    <div key={label} className="space-y-1.5">
                      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
                      {hoofPhotos[idx] ? (
                        <div className="relative">
                          <img
                            src={hoofPreviews[idx]!}
                            alt={label}
                            className="w-full h-20 object-cover rounded-lg border border-border"
                          />
                          <button
                            onClick={() => removeHoofPhoto(idx)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px]"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => hoofInputRefs[idx].current?.click()}
                          className="w-full h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:border-secondary/50 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-muted-foreground" />
                          <span className="text-[9px] text-muted-foreground mt-0.5">Add photo</span>
                        </button>
                      )}
                      <input
                        ref={hoofInputRefs[idx]}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleHoofPhotoSelect(idx, f);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Analysis Type (Walk mode only) */}
      {analysisMode === "walk" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Analysis Type</CardTitle>
            <CardDescription>Choose what to analyse (select all that apply)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ANALYSIS_TYPES.map(t => (
                <label
                  key={t.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTypes.includes(t.id)
                      ? "border-secondary bg-secondary/10"
                      : "border-border hover:border-secondary/30"
                  }`}
                >
                  <Checkbox
                    checked={selectedTypes.includes(t.id)}
                    onCheckedChange={() => toggleType(t.id)}
                  />
                  <span className="text-sm font-medium">{t.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4 — Run */}
      <Button
        onClick={handleRunAnalysis}
        disabled={!mediaFile || analysing || (analysisMode === "walk" && selectedTypes.length === 0)}
        variant="premium"
        className="w-full"
        size="lg"
      >
        {analysing ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing...</>
        ) : (
          <><Search className="w-4 h-4 mr-2" /> {analysisMode === "gallop" ? "Run Breeze Analysis" : "Run Visual Analysis"}</>
        )}
      </Button>

      {/* Progress */}
      {progress && (
        <div className="space-y-2 bg-accent/10 rounded-lg p-4">
          <p className="text-sm font-medium">{progress.stage}</p>
          <Progress value={progress.percent} className="h-2" />
        </div>
      )}

      {/* Section 5 — Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analysis Results{horseName ? ` — ${horseName}` : ""}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ═══ ANNOTATED FRAMES — biomechanical overlays ═══ */}
            {annotatedFrames.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">
                    📸 Annotated {annotatedFrames.length === 1 ? "Frame" : "Frames"} — Biomechanical Overlay
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      annotatedFrames.forEach((f) => {
                        const a = document.createElement("a");
                        a.href = f.annotatedDataUrl;
                        a.download = `Visual_Frame${f.frameIndex + 1}_${(horseName || "horse").replace(/\s+/g, "_")}.jpg`;
                        a.click();
                      });
                      toast({ title: "Frames Downloaded", description: `${annotatedFrames.length} annotated frame(s) saved.` });
                    }}
                  >
                    <Download className="w-3.5 h-3.5" /> Download All
                  </Button>
                </div>
                <div className={`grid gap-2 ${annotatedFrames.length === 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
                  {annotatedFrames.map((frame) => (
                    <div key={frame.frameIndex} className="space-y-1">
                      <img
                        src={frame.annotatedDataUrl}
                        alt={frame.label}
                        className="w-full rounded-lg border border-secondary/20 cursor-pointer hover:border-secondary/60 transition-colors"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = frame.annotatedDataUrl;
                          a.download = `Visual_Frame${frame.frameIndex + 1}_${frame.label.replace(/\s/g, "_")}.jpg`;
                          a.click();
                        }}
                        title="Click to download"
                      />
                      <p className="text-[10px] text-center text-muted-foreground font-medium truncate">{frame.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground italic text-center">
                  Click any frame to download. Overlays show topline, limb skeleton, joint angles and stride metrics.
                </p>

                {/* ═══ INTERACTIVE MOTION MAPPING ═══ */}
                {poseFrames.length > 0 ? (
                  <VideoPoseViewer frames={poseFrames} title="Interactive Motion Mapping" />
                ) : rawFrames.length > 0 && (
                  <div className="border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={poseLoading}
                      onClick={async () => {
                        setPoseLoading(true);
                        try {
                          const { data, error } = await supabase.functions.invoke("video-pose-frames", {
                            body: { frames: rawFrames.slice(0, 12), fps: 6 },
                          });
                          if (error) throw error;
                          if ((data as any)?.error) throw new Error((data as any).error);
                          setPoseFrames(((data as any).frames || []) as PoseFrame[]);
                        } catch (e: any) {
                          toast({ title: "Motion mapping failed", description: e?.message || "Unknown error", variant: "destructive" });
                        } finally {
                          setPoseLoading(false);
                        }
                      }}
                    >
                      {poseLoading
                        ? <><Loader2Icon className="w-4 h-4 mr-2 animate-spin" />Mapping motion…</>
                        : <><Activity className="w-4 h-4 mr-2" />Generate interactive motion map</>}
                    </Button>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Frame-by-frame skeleton, joint-angle dashboard, heat map and frame comparison from BloodstockAI — no calculation is re-run.
                    </p>
                  </div>
                )}
                {/* ─── Numbered-point legend with detailed explanations ─── */}
                <div className="mt-4 rounded-lg border border-secondary/20 bg-muted/20 p-4">
                  <h5 className="text-sm font-semibold text-foreground mb-3">
                    What each numbered point means
                  </h5>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {BIOMECHANIC_LEGEND.map((item) => {
                      const score = (result as any)?.[item.key] as number | undefined;
                      return (
                        <div
                          key={item.number}
                          className="flex gap-3 p-3 rounded-md bg-background/60 border border-border/50"
                        >
                          <div className="shrink-0 w-8 h-8 rounded-full bg-secondary/15 border border-secondary/40 flex items-center justify-center text-sm font-bold text-secondary">
                            {item.number}
                          </div>
                          <div className="space-y-1 text-xs leading-relaxed">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-foreground text-sm">{item.title}</p>
                              {typeof score === "number" && (
                                <span className="text-[10px] font-bold text-secondary whitespace-nowrap">
                                  {score}/100
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground/80">Where:</span> {item.anatomy}
                            </p>
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground/80">What we look at:</span> {item.what}
                            </p>
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground/80">Why it matters:</span> {item.why}
                            </p>
                            <p className="text-[10px] text-muted-foreground/80 italic">
                              {item.scoreGuide}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Breeze-specific metrics (gallop mode) */}
            {analysisMode === "gallop" && (
              <>
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {result.limbExtensionAngle && (
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-secondary">{result.limbExtensionAngle}°</p>
                      <p className="text-[10px] text-muted-foreground">Limb Extension</p>
                    </div>
                  )}
                  {result.strideLengthMeters && (
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-secondary">{result.strideLengthMeters}m</p>
                      <p className="text-[10px] text-muted-foreground">Stride Length</p>
                    </div>
                  )}
                  {result.estimatedSpeedKmh && (
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-secondary">{result.estimatedSpeedKmh}</p>
                      <p className="text-[10px] text-muted-foreground">km/h (est.)</p>
                    </div>
                  )}
                  {result.estimatedSpeedMph && (
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-secondary">{result.estimatedSpeedMph}</p>
                      <p className="text-[10px] text-muted-foreground">mph (est.)</p>
                    </div>
                  )}
                </div>

                {result.gallopScore !== undefined && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-secondary/10 rounded-lg p-3 text-center border border-secondary/20">
                      <p className="text-lg font-bold text-secondary">{result.gallopScore}<span className="text-xs font-normal text-muted-foreground">/10</span></p>
                      <p className="text-[10px] text-muted-foreground">Gallop Score</p>
                    </div>
                    {result.eyeCatchingRating && (
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-sm font-bold text-foreground">{"⭐".repeat(result.eyeCatchingRating)}</p>
                        <p className="text-[10px] text-muted-foreground">Eye-Catching Factor</p>
                      </div>
                    )}
                    {result.soundnessFlag !== undefined && (
                      <div className={`rounded-lg p-3 text-center ${result.soundnessFlag ? "bg-red-500/10 border border-red-500/20" : "bg-green-500/10 border border-green-500/20"}`}>
                        <p className="text-sm font-bold">{result.soundnessFlag ? "⚠️ Flag" : "✅ Sound"}</p>
                        <p className="text-[10px] text-muted-foreground">Soundness</p>
                      </div>
                    )}
                  </div>
                )}

                {result.distancePrediction && (
                  <div className="pt-3 border-t border-border">
                    <h4 className="text-xs font-semibold text-secondary mb-2">Distance Prediction</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">{result.distancePrediction.sprint}%</p>
                        <p className="text-[10px] text-muted-foreground">Sprint (5-6f)</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">{result.distancePrediction.mile}%</p>
                        <p className="text-[10px] text-muted-foreground">Mile (7-8f)</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">{result.distancePrediction.classic}%</p>
                        <p className="text-[10px] text-muted-foreground">Classic (10f+)</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Walk-specific metrics */}
            {analysisMode === "walk" && result.priorityActions && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Priority Actions</h4>
                {result.priorityActions.urgent?.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-600 mb-1">🔴 Urgent</p>
                    {result.priorityActions.urgent.map((a: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">• {a}</p>
                    ))}
                  </div>
                )}
                {result.priorityActions.monitor?.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-yellow-600 mb-1">🟡 Monitor</p>
                    {result.priorityActions.monitor.map((a: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">• {a}</p>
                    ))}
                  </div>
                )}
                {result.priorityActions.noAction?.length > 0 && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-600 mb-1">🟢 No Action Required</p>
                    {result.priorityActions.noAction.map((a: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">• {a}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Body Condition Score (Walk mode) */}
            {analysisMode === "walk" && result.bodyConditionScore && (
              <div className="bg-muted/30 rounded-lg p-3 inline-block">
                <p className="text-xs text-muted-foreground">Body Condition Score (Henneke)</p>
                <p className="text-lg font-bold text-secondary">{result.bodyConditionScore}<span className="text-xs font-normal text-muted-foreground">/9</span></p>
              </div>
            )}

            {/* Score Dashboard removed — Biomechanical Scorecard (Weighted) is the single source of truth */}

            {/* Hoof Analysis Section */}
            {analysisMode === "walk" && result.hoofAnalysis && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">🔩 Hoof Structure Analysis</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-lg p-4 border border-border">
                  {result.hoofAnalysis}
                </div>
              </div>
            )}

            {/* Written Analysis */}
            {result.analysis && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Full Analysis</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-lg p-4 border border-border max-h-96 overflow-y-auto">
                  {result.analysis}
                </div>
              </div>
            )}

            {/* Clinical Summary (Walk mode) */}
            {analysisMode === "walk" && result.clinicalSummary && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">🏥 Clinical Summary</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-lg p-4 border border-border">
                  {result.clinicalSummary}
                </div>
              </div>
            )}

            {/* Strengths & Concerns */}
            {(result.strengths?.length > 0 || result.concerns?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.strengths?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-secondary">✅ Strengths</h4>
                    <ul className="space-y-1">
                      {result.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-secondary mt-0.5">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.concerns?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-destructive">⚠️ Concerns</h4>
                    <ul className="space-y-1">
                      {result.concerns.map((c: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-destructive mt-0.5">•</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Verdict */}
            {result.verdict && (
              <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-secondary mb-1">Final Verdict & Recommendation</h4>
                <p className="text-sm text-foreground">{result.verdict}</p>
              </div>
            )}

            {/* Breeze disclaimer */}
            {analysisMode === "gallop" && (
              <p className="text-[10px] text-muted-foreground italic">
                ⚠️ Speed and stride estimates are derived from visual frame analysis and should be treated as approximations only. This analysis does not replace physical veterinary examination.
              </p>
            )}

            {/* Walk disclaimer */}
            {analysisMode === "walk" && (
              <p className="text-[10px] text-muted-foreground italic">
                ⚠️ This AI assessment does not replace physical veterinary examination or professional farriery assessment. Always consult qualified professionals for diagnosis and treatment.
              </p>
            )}

            {/* Section 6 — Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  try {
                    await generateVisualAnalysisPDF({
                      horseName,
                      sire,
                      dam,
                      analysisMode,
                      result,
                      annotatedFrames,
                    });
                    toast({ title: "PDF Generated!", description: `Report includes ${annotatedFrames.length} annotated frame(s).` });
                  } catch (e: any) {
                    toast({ title: "PDF Failed", description: e.message || "Could not generate PDF", variant: "destructive" });
                  }
                }}
              >
                <FileText className="w-4 h-4" /> Generate PDF Report
              </Button>
              {annotatedFrames.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    annotatedFrames.forEach((f, i) => {
                      const a = document.createElement("a");
                      a.href = f.annotatedDataUrl;
                      a.download = `BloodstockAI_VisualFrame_${i + 1}.jpg`;
                      a.click();
                    });
                    toast({ title: "Frames Downloaded", description: `${annotatedFrames.length} annotated frame(s) saved.` });
                  }}
                >
                  <Download className="w-4 h-4" /> Download Frames (JPG)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} type={paywallType} />
    </div>
  );
};
