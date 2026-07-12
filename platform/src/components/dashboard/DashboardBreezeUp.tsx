import { useState, useRef, useCallback } from "react";
import { usePaywall } from "@/hooks/usePaywall";
import { PaywallModal } from "@/components/PaywallModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, FileText, Download, Search, Scale, Camera, X, Image as ImageIcon, Video, FileDown, Star, ShieldCheck, ShieldAlert } from "lucide-react";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { UpgradeModal } from "@/components/UpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useToast } from "@/components/ui/use-toast";
import { annotateBreezFrames, type FrameAnnotation } from "@/utils/breezeFrameAnnotation";
import { generateBreezeUpPDF } from "@/utils/breezeUpPdfReport";
import { computeBiomechanics, mergeComputedIntoBreezeResult } from "@/utils/breezeBiomechanics";

// ═══ VISUAL SCORE HELPERS ═══
function scoreColor(score: number) {
  if (score >= 70) return "text-green-500";
  if (score >= 45) return "text-yellow-500";
  return "text-red-500";
}
function scoreDot(score: number) {
  if (score >= 70) return "🟢";
  if (score >= 45) return "🟡";
  return "🔴";
}
function progressColor(score: number) {
  if (score >= 70) return "bg-green-500";
  if (score >= 45) return "bg-yellow-500";
  return "bg-red-500";
}

// ═══ VIDEO FRAME EXTRACTION (6 frames for general visual) ═══
async function extractVideoFrames(file: File, count = 6): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!duration || duration <= 0) { URL.revokeObjectURL(url); reject(new Error("Invalid video")); return; }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Canvas not supported")); return; }

      const frames: string[] = [];
      const percentages = [0, 0.2, 0.4, 0.6, 0.8, 0.99];
      let idx = 0;

      video.onseeked = () => {
        canvas.width = Math.min(video.videoWidth, 1280);
        canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.85));
        idx++;
        if (idx < percentages.length) {
          video.currentTime = percentages[idx] * duration;
        } else {
          URL.revokeObjectURL(url);
          resolve(frames);
        }
      };
      video.currentTime = percentages[0] * duration;
    };

    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load video")); };
  });
}

// ═══ BREEZE VIDEO FRAME EXTRACTION (8 frames at gallop-critical moments) ═══
async function extractBreezeFrames(videoFile: File): Promise<{ frames: string[]; timestamps: number[] }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(videoFile);
    let finished = false;

    const cleanup = () => {
      finished = true;
      clearTimeout(loadTimer);
      URL.revokeObjectURL(url);
    };

    const fail = (message: string) => {
      if (finished) return;
      cleanup();
      reject(new Error(message));
    };

    const loadTimer = window.setTimeout(() => {
      fail("Video took too long to load. Please try an H.264 MP4 export.");
    }, 15000);

    video.src = url;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) { fail("Invalid video duration"); return; }

      const ctx = canvas.getContext("2d");
      if (!ctx) { fail("Canvas not supported"); return; }

      const frames: string[] = [];
      // 8 frames at gallop-critical biomechanical moments
      const safeTime = (ratio: number) => Math.min(Math.max(duration * ratio, 0.08), Math.max(duration - 0.08, 0.08));
      const timestamps = [0.05, 0.18, 0.32, 0.42, 0.52, 0.64, 0.78, 0.92].map(safeTime);
      let idx = 0;

      video.onseeked = () => {
        if (!video.videoWidth || !video.videoHeight) { fail("Video frame could not be decoded"); return; }
        canvas.width = Math.min(video.videoWidth, 960);
        canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.76));
        idx++;
        if (idx < timestamps.length) {
          try { video.currentTime = timestamps[idx]; } catch { fail("Video frame seek failed"); }
        } else {
          cleanup();
          resolve({ frames, timestamps });
        }
      };

      try { video.currentTime = timestamps[0]; } catch { fail("Video frame seek failed"); }
    };

    video.onerror = () => {
      const code = video.error?.code;
      const codecHint = code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        ? " This video codec is not supported by the browser preview; export as H.264 MP4 and try again."
        : "";
      fail(`Failed to load video.${codecHint}`);
    };

    video.load();
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export const DashboardBreezeUp = () => {
  const [lotNumber, setLotNumber] = useState("");
  const [horseName, setHorseName] = useState("");
  const [sire, setSire] = useState("");
  const [dam, setDam] = useState("");
  const [saleName, setSaleName] = useState("");
  const [catalogFile, setCatalogFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; percent: number } | null>(null);
  const [result, setResult] = useState<any>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Visual analysis state
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [visualResult, setVisualResult] = useState<any>(null);
  const [combinedResult, setCombinedResult] = useState<any>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Breeze video analysis state
  const [breezeVideoFile, setBreezeVideoFile] = useState<File | null>(null);
  const [isDraggingBreeze, setIsDraggingBreeze] = useState(false);
  const [breezeAnalysing, setBreezeAnalysing] = useState(false);
  const [breezeProgress, setBreezeProgress] = useState<{ stage: string; percent: number } | null>(null);
  const [breezeResult, setBreezeResult] = useState<any>(null);
  const [annotatedFrames, setAnnotatedFrames] = useState<FrameAnnotation[]>([]);
  const [rawFrames, setRawFrames] = useState<string[]>([]);
  const breezeVideoInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { isPaidPlan } = useCredits();
  const { toast } = useToast();
  const { gate, paywallOpen, setPaywallOpen, paywallType } = usePaywall();

  // ═══ MEDIA UPLOAD HANDLERS ═══
  const handleMediaSelect = useCallback((file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast({ title: "Unsupported format", description: "Upload JPG, PNG, WebP, MP4 or MOV", variant: "destructive" });
      return;
    }
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "File too large", description: `Max ${isVideo ? "100MB for video" : "10MB for photos"}`, variant: "destructive" });
      return;
    }
    setMediaFile(file);
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => setMediaPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setMediaPreview(null);
    }
  }, [toast]);

  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMedia(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleMediaSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".pdf")) {
      if (file.size > 60 * 1024 * 1024) {
        toast({ title: "File too large", description: "PDF max size is 60MB", variant: "destructive" });
        return;
      }
      setCatalogFile(file);
    }
  };

  // ═══ BREEZE VIDEO UPLOAD HANDLER ═══
  const handleBreezeVideoSelect = useCallback((file: File) => {
    const name = (file.name || "").toLowerCase();
    const validExt = /\.(mp4|mov|m4v|qt|webm|mkv|avi)$/i.test(name);
    const isVideoMime = (file.type || "").startsWith("video/");
    // iPhone .MOV often arrives with empty mime or application/octet-stream — fall back to extension.
    if (!isVideoMime && !validExt) {
      toast({ title: "Video only", description: "Upload an MP4 or MOV video file", variant: "destructive" });
      return;
    }
    if (file.size > 150 * 1024 * 1024) {
      toast({ title: "File too large", description: "Video max size is 150MB", variant: "destructive" });
      return;
    }
    setBreezeVideoFile(file);
  }, [toast]);

  const handleBreezeVideoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBreeze(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleBreezeVideoSelect(file);
  };

  // ═══ BREEZE VIDEO ANALYSIS ═══
  const runBreezeVideoAnalysis = async () => {
    if (!breezeVideoFile) return;
    if (gate("breezeup")) return;

    setBreezeAnalysing(true);
    // Hard reset every piece of state from the previous horse so nothing leaks
    // into the new analysis (avoids visually-identical results across horses).
    setBreezeResult(null);
    setAnnotatedFrames([]);
    setRawFrames([]);
    setBreezeProgress(null);

    try {
      setBreezeProgress({ stage: "Extracting key gallop frames...", percent: 15 });
      const { frames, timestamps } = await extractBreezeFrames(breezeVideoFile);
      setRawFrames(frames);

      setBreezeProgress({ stage: "Detecting anatomical keypoints (AI Vision)...", percent: 25 });
      const annotated = await annotateBreezFrames(frames);
      setAnnotatedFrames(annotated);

      setBreezeProgress({ stage: "Uploading selected frames securely...", percent: 35 });

      if (!user?.id) throw new Error("Please log in before analysing a breeze video.");

      const framePaths: string[] = [];
      const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const aiFrameIndexes = frames.map((_, index) => index);
      for (const frameIndex of aiFrameIndexes) {
        const frameNumber = frameIndex + 1;
        const path = `${user.id}/breeze-frames/${runId}/frame-${String(frameNumber).padStart(2, "0")}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("pdf-uploads")
          .upload(path, dataUrlToBlob(frames[frameIndex]), { contentType: "image/jpeg", upsert: true });
        if (uploadError) throw uploadError;
        framePaths.push(path);
      }

      setBreezeProgress({ stage: `Analysing ${framePaths.length} gallop frames with AI vision...`, percent: 55 });

      // Per-run unique signature: filename + size + lastModified + lot + horse + nonce.
      // This makes every request distinct so the model cannot return cached/templated output.
      const horseSignature = [
        lotNumber || "no-lot",
        horseName || "unnamed",
        sire || "unknown-sire",
        dam || "unknown-dam",
        breezeVideoFile.name,
        breezeVideoFile.size,
        breezeVideoFile.lastModified,
        Date.now(),
        Math.random().toString(36).slice(2, 10),
      ].join("|");

      const data = await invokeEdgeFunction("ai-analysis", {
        requireSession: true,
        body: {
          type: "breeze_video_analysis",
          frame_paths: framePaths,
          horse_name: horseName || `${sire} x ${dam}`,
          sire,
          dam,
          lot_number: lotNumber || null,
          horse_signature: horseSignature,
        },
      });

      if (data?.error) throw new Error(data.error);

      // ═══ Override LLM estimates with measurements computed from real keypoints + timestamps ═══
      setBreezeProgress({ stage: "Computing measurements from keypoints + timestamps...", percent: 90 });
      const computed = computeBiomechanics(annotated, timestamps);
      const merged = mergeComputedIntoBreezeResult(data, computed);

      setBreezeProgress({ stage: "Breeze analysis complete!", percent: 100 });
      setBreezeResult(merged);
      setTimeout(() => setBreezeProgress(null), 2000);
      toast({ title: "Breeze Video Analysis Complete!", description: "Gallop biomechanics, annotated frames, and PDF export ready." });
    } catch (err: any) {
      toast({ title: "Analysis Failed", description: err.message || "Error analysing breeze video", variant: "destructive" });
      setBreezeProgress(null);
    } finally {
      setBreezeAnalysing(false);
    }
  };

  // ═══ VISUAL ANALYSIS ═══
  const runVisualAnalysis = async (): Promise<any> => {
    if (!mediaFile) return null;

    const isVideo = mediaFile.type.startsWith("video/");

    if (isVideo) {
      setProgress({ stage: "🎬 Extracting video frames...", percent: 20 });
      const frames = await extractVideoFrames(mediaFile);
      setProgress({ stage: "📷 Analysing movement via AI Vision...", percent: 35 });

      const data = await invokeEdgeFunction("ai-analysis", {
        requireSession: true,
        body: {
          type: "visual_analysis",
          video_frames: frames,
          horse_name: horseName || `${sire} x ${dam}`,
          sire,
          dam,
          analysis_types: ["conformation", "biomechanics", "temperament"],
        },
      });
      return data;
    } else {
      setProgress({ stage: "📷 Uploading photo...", percent: 20 });
      const ext = mediaFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `visual/${user?.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("pdf-uploads")
        .upload(filePath, mediaFile);
      if (uploadError) throw uploadError;

      setProgress({ stage: "🔍 AI Vision analysing conformation...", percent: 35 });
      const data = await invokeEdgeFunction("ai-analysis", {
        requireSession: true,
        body: {
          type: "visual_analysis",
          file_path: filePath,
          media_type: mediaFile.type,
          horse_name: horseName || `${sire} x ${dam}`,
          sire,
          dam,
          analysis_types: ["conformation", "biomechanics", "temperament"],
        },
      });
      return data;
    }
  };

  // ═══ MERGE VISUAL + PEDIGREE ═══
  const runMergedAnalysis = async (visualData: any, pedigreeData: any): Promise<any> => {
    setProgress({ stage: "🧬 Merging visual + pedigree analysis...", percent: 85 });

    const visualSummary = visualData?.analysis || visualData?.verdict || JSON.stringify(visualData?.scores || {});
    const pedigreeSummary = pedigreeData?.executiveSummary || pedigreeData?.analysis_summary || pedigreeData?.ai_report?.summary || "";

    const data = await invokeEdgeFunction("ai-analysis", {
      requireSession: true,
      body: {
        type: "horse_report",
        payload: JSON.stringify({
          analysis_mode: "breezeup_merge",
          horse_name: horseName || `${sire} x ${dam}`,
          sire,
          dam,
          instructions: `You have two analyses for the same breeze-up horse.

Horse: ${horseName || `${sire} x ${dam}`}
Sire: ${sire}
Dam: ${dam}

VISUAL ANALYSIS (from photo/video):
${visualSummary}

Visual Scores: ${JSON.stringify(visualData?.scores || {})}

PEDIGREE & FAMILY ANALYSIS:
${pedigreeSummary}

Now produce a COMBINED VERDICT of 3-4 sentences covering:
1. Does the physical conformation match what the pedigree predicts?
2. Any conflicts between visual and genetic assessment?
3. Combined confidence in this horse's potential
4. Final adjusted bid recommendation

Return JSON:
{
  "combinedVerdict": "3-4 sentence combined assessment",
  "overallScore": 0-100,
  "confidence": 0-100,
  "geneticScore": 0-100,
  "visualScore": 0-100,
  "recommendedMaxBid": "$X-$Y",
  "pedigreeVisualAlignment": "Strong/Moderate/Weak",
  "adjustedRecommendation": "BID/WATCH/PASS"
}`,
        }),
      },
    });
    return data;
  };

  // ═══ RUN ANALYSIS (main) ═══
  const handleRunAnalysis = async () => {
    if (gate("breezeup")) return;
    if (!sire || !dam) {
      toast({ title: "Missing fields", description: "Sire and Dam are required for Breeze-Up analysis", variant: "destructive" });
      return;
    }

    setAnalysing(true);
    setResult(null);
    setVisualResult(null);
    setCombinedResult(null);

    try {
      // Step 1: Visual analysis (if media uploaded)
      let visualData: any = null;
      if (mediaFile) {
        visualData = await runVisualAnalysis();
        setVisualResult(visualData);
      }

      // Step 2: Pedigree/family analysis
      setProgress({ stage: "🔍 Researching pedigree and family...", percent: mediaFile ? 50 : 15 });

      const payload: Record<string, any> = {
        type: "horse_report",
        payload: JSON.stringify({
          analysis_mode: "breezeup",
          lot_number: lotNumber || undefined,
          horse_name: horseName || `${sire} x ${dam}`,
          sire,
          dam,
          sale_name: saleName || undefined,
          instructions: `BREEZE-UP ANALYSIS for a 2-year-old sale horse.

Horse: ${horseName || "Unnamed"} (Lot ${lotNumber || "N/A"})
Sire: ${sire}
Dam: ${dam}
Sale: ${saleName || "Not specified"}

Perform a DEEP FAMILY RESEARCH analysis covering:

1. SIRE PROFILE: Complete stats — runners, winners, stakes winners, win%, average earnings, stud fee, best performers, surface/distance preferences, sale averages.

2. DAM PROFILE & PRODUCE RECORD: Dam's own race record, all foals produced with year, sex, sire, race results and earnings. Stakes winners highlighted.

3. SIBLINGS ANALYSIS: Full siblings and half-siblings (by dam). For each: name, sire, sex, year, race record, earnings, best achievement.

4. 3-GENERATION PERFORMANCE: Analyse racing performance through 3 generations on both sides. Which side (sire or dam) has produced more winners and higher earners?

5. PEDIGREE ANALYSIS: Full 5-generation pedigree, dosage calculation, inbreeding patterns, nick rating between sire line and dam's sire line.

6. PERFORMANCE PREDICTIONS: Projected distance aptitude, surface preference, class ceiling, peak age.

7. MARKET ANALYSIS: Comparable sales of similar pedigrees. What have siblings sold for? What have similar sire x dam-sire crosses sold for?

8. BIDDING STRATEGY:
   - Opening bid recommendation
   - Target price
   - Maximum bid (walk-away price)
   - Value assessment vs market

9. RISK ASSESSMENT: Genetic risks, commercial risks, soundness indicators from family.

10. FINAL VERDICT: Overall recommendation — BID / WATCH / PASS with confidence level and reasoning.

Return complete JSON with all sections.`,
        }),
      };

      setProgress({ stage: "🧠 AI is analysing family history...", percent: mediaFile ? 65 : 40 });

      const data = await invokeEdgeFunction("ai-analysis", { requireSession: true, body: payload });
      if (data?.error) throw new Error(data.error);

      setResult(data);

      // Step 3: Merge if visual was done
      let mergedData: any = null;
      if (visualData) {
        mergedData = await runMergedAnalysis(visualData, data);
        setCombinedResult(mergedData);
      }

      setProgress({ stage: "✅ Analysis complete!", percent: 100 });
      setTimeout(() => setProgress(null), 2000);
      toast({ title: "Breeze-Up Analysis Complete!", description: `${horseName || `${sire} x ${dam}`} has been analysed.` });
    } catch (err: any) {
      toast({ title: "Analysis Failed", description: err.message || "Error running analysis", variant: "destructive" });
      setProgress(null);
    } finally {
      setAnalysing(false);
    }
  };

  // Extract key sections from the result
  const exec = result?.executiveSummary || result?.analysis_summary || result?.ai_report?.summary;
  const pedigree = result?.pedigreeAssessment;
  const performance = result?.performanceAssessment;
  const breeding = result?.breedingValue;
  const commercial = result?.commercialProfile;
  const risks = result?.riskFactors;
  const recs = result?.recommendations;
  const chartData = result?.chartData;

  // Visual metrics
  const visualScores = visualResult?.scores;
  const visualMetrics = visualScores ? {
    speedPotential: visualScores.gait ?? visualScores.overall ?? 0,
    strideEfficiency: visualScores.biomechanics ?? 0,
    biomechanics: visualScores.biomechanics ?? 0,
    temperament: visualScores.behaviour ?? 0,
    athleticism: visualScores.musculature ?? 0,
    physicalMaturity: visualScores.conformation ?? 0,
  } : null;

  // Breeze metrics
  const breezeScores = breezeResult?.scores;

  return (
    <div className="space-y-6">
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
            Breeze-Up Analysis
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Deep family research for 2-year-old sale horses.
          Pedigree, siblings, sire stats and professional report with bidding strategy.
        </p>
      </div>

      {/* Section 1 — Horse Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horse Details</CardTitle>
          <CardDescription>Enter the lot details — Sire and Dam are required</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Lot Number</Label>
              <Input value={lotNumber} onChange={e => setLotNumber(e.target.value)} placeholder="e.g. 123" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horse Name (if named)</Label>
              <Input value={horseName} onChange={e => setHorseName(e.target.value)} placeholder="Leave blank if unnamed" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sire <span className="text-destructive">*</span></Label>
              <Input value={sire} onChange={e => setSire(e.target.value)} placeholder="e.g. Frankel" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dam <span className="text-destructive">*</span></Label>
              <Input value={dam} onChange={e => setDam(e.target.value)} placeholder="e.g. Kind" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sale Name (optional)</Label>
            <Input value={saleName} onChange={e => setSaleName(e.target.value)} placeholder="e.g. Tattersalls Craven Breeze-Up 2026" />
          </div>
        </CardContent>
      </Card>

      {/* ═══ BREEZE-UP VIDEO ANALYSIS SECTION ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Breeze-Up Video Analysis
          </CardTitle>
          <CardDescription>
            Upload a gallop or breeze video for biomechanical assessment with stride metrics and speed estimation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              isDraggingBreeze ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/50"
            }`}
            onDrop={handleBreezeVideoDrop}
            onDragOver={e => { e.preventDefault(); setIsDraggingBreeze(true); }}
            onDragLeave={() => setIsDraggingBreeze(false)}
          >
            <input
              ref={breezeVideoInputRef}
              type="file"
              accept="video/*,.mp4,.mov,.m4v,.qt,.webm"
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleBreezeVideoSelect(f); }}
            />
            {breezeVideoFile ? (
              <div className="relative z-20 space-y-3 pointer-events-none">
                <div className="w-16 h-16 mx-auto rounded-lg bg-secondary/10 flex items-center justify-center border border-secondary/20">
                  <Video className="w-8 h-8 text-secondary" />
                </div>
                <p className="text-sm font-medium">{breezeVideoFile.name}</p>
                <p className="text-xs text-muted-foreground">{(breezeVideoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <Button variant="ghost" size="sm" className="text-xs pointer-events-auto" onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setBreezeVideoFile(null);
                  setBreezeResult(null);
                  if (breezeVideoInputRef.current) breezeVideoInputRef.current.value = "";
                }}>
                  <X className="w-3 h-3 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <div className="pointer-events-none space-y-2">
                <Video className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Upload Breeze / Gallop Video</p>
                <p className="text-xs text-muted-foreground">Drag & drop or click to browse</p>
                <p className="text-[10px] text-muted-foreground">MP4 · MOV · max 150MB</p>
              </div>
            )}
          </div>

          <Button
            onClick={() => {
              if (!breezeVideoFile) {
                breezeVideoInputRef.current?.click();
                return;
              }
              runBreezeVideoAnalysis();
            }}
            disabled={breezeAnalysing}
            variant="premium"
            className="w-full"
            size="lg"
          >
            {breezeAnalysing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing Breeze...</>
            ) : (
              <><Search className="w-4 h-4 mr-2" /> 🔍 Analyze Breeze Video</>
            )}
          </Button>

          {/* Breeze Progress */}
          {breezeProgress && (
            <div className="space-y-2 bg-accent/10 rounded-lg p-4">
              <p className="text-sm font-medium">{breezeProgress.stage}</p>
              <Progress value={breezeProgress.percent} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ ANNOTATED STRIDE FRAMES ═══ */}
      {annotatedFrames.length > 0 && (
        <Card className="border-secondary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Annotated Stride Frames — Biomechanical Overlay
            </CardTitle>
            <CardDescription>Gold lines indicate topline, limb angles, stride triangle, and balance axis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {annotatedFrames.map((frame) => (
                <div key={frame.frameIndex} className="space-y-1">
                  <img
                    src={frame.annotatedDataUrl}
                    alt={frame.label}
                    className="w-full rounded-lg border border-secondary/20 cursor-pointer hover:border-secondary/60 transition-colors"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = frame.annotatedDataUrl;
                      a.download = `BreezeUp_Frame${frame.frameIndex + 1}_${frame.label.replace(/\s/g, "_")}.jpg`;
                      a.click();
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground text-center">{frame.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">Click any frame to download the annotated image.</p>
          </CardContent>
        </Card>
      )}

      {/* ═══ BREEZE VIDEO RESULTS ═══ */}
      {breezeResult && (() => {
        // Helper: read measurement that may be either { value, confidence, frameIndex, note } or a raw number/string
        const readM = (m: any) => {
          if (m === null || m === undefined) return { value: null as any, confidence: null as string | null, frameIndex: null as number | null, note: "" };
          if (typeof m === "object" && "value" in m) return { value: m.value, confidence: m.confidence ?? null, frameIndex: m.frameIndex ?? null, note: m.note ?? "" };
          return { value: m, confidence: null, frameIndex: null, note: "" };
        };
        const confBadge = (c: string | null) => {
          if (!c) return null;
          const cls = c === "high" ? "bg-green-500/15 text-green-600 border-green-500/30"
                    : c === "medium" ? "bg-yellow-500/15 text-yellow-600 border-yellow-500/30"
                    : "bg-red-500/15 text-red-500 border-red-500/30";
          return <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${cls}`}>{c}</Badge>;
        };
        const limb = readM(breezeResult.limbExtensionAngle);
        const shoulder = readM(breezeResult.shoulderAngle);
        const hip = readM(breezeResult.hipEngagementAngle);
        const hock = readM(breezeResult.hockFlexion);
        const frontReach = readM(breezeResult.frontReachAngle);
        const rearDrive = readM(breezeResult.rearDriveAngle);
        const strideMeters = breezeResult.strideLengthMeters;
        const strideRatio = breezeResult.strideLengthBodyRatio;
        const strideConf = breezeResult.strideLengthConfidence ?? null;
        const strideFrame = breezeResult.strideLengthFrameIndex ?? breezeResult.bestStrideFrameIndex;
        const speedConf = breezeResult.speedConfidence ?? null;
        return (
        <Card className="border-secondary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Breeze Biomechanics Results
            </CardTitle>
            {breezeResult.overallMeasurementConfidence && (
              <CardDescription>
                Overall measurement confidence: <span className="font-semibold capitalize">{breezeResult.overallMeasurementConfidence}</span>
                {breezeResult.bestStrideFrameReason && <span className="block mt-1 italic text-[11px]">Best stride frame: #{(breezeResult.bestStrideFrameIndex ?? 0) + 1} — {breezeResult.bestStrideFrameReason}</span>}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ── Row 1: Stride mechanics (3 columns) ── */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">Stride Mechanics</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center h-[88px] flex flex-col justify-center">
                  <p className="text-xl font-bold text-secondary leading-none">{limb.value != null ? `${limb.value}°` : "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Stride Opening</p>
                  <div className="flex justify-center items-center gap-1 mt-1.5 h-[14px]">{limb.value != null && confBadge(limb.confidence)}{limb.value != null && limb.frameIndex != null && <span className="text-[9px] text-muted-foreground">F{limb.frameIndex + 1}</span>}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center h-[88px] flex flex-col justify-center">
                  <p className="text-xl font-bold text-secondary leading-none truncate">{strideMeters != null ? `${strideMeters}m` : (strideRatio ? (typeof strideRatio === "string" ? strideRatio.replace(/\s*body-?lengths?/i, "x") : strideRatio) : "—")}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Stride Length</p>
                  <div className="flex justify-center items-center gap-1 mt-1.5 h-[14px]">{(strideMeters != null || strideRatio) && confBadge(strideConf)}{strideFrame != null && <span className="text-[9px] text-muted-foreground">F{strideFrame + 1}</span>}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center h-[88px] flex flex-col justify-center">
                  <p className="text-xl font-bold text-secondary leading-none">{breezeResult.strideFrequency ?? "—"}{breezeResult.strideFrequency && <span className="text-xs font-normal text-muted-foreground">/min</span>}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Stride Frequency</p>
                  <div className="h-[14px] mt-1.5" />
                </div>
              </div>
            </div>

            {/* ── Row 2: Body angles (3 columns, fixed positions) ── */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">Body Angles</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center h-[82px] flex flex-col justify-center">
                  <p className="text-lg font-bold text-foreground leading-none">{shoulder.value != null ? `${shoulder.value}°` : "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Shoulder</p>
                  <div className="flex justify-center items-center gap-1 mt-1.5 h-[14px]">{shoulder.value != null && confBadge(shoulder.confidence)}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center h-[82px] flex flex-col justify-center">
                  <p className="text-lg font-bold text-foreground leading-none">{hip.value != null ? `${hip.value}°` : "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Hip Drive</p>
                  <div className="flex justify-center items-center gap-1 mt-1.5 h-[14px]">{hip.value != null && confBadge(hip.confidence)}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center h-[82px] flex flex-col justify-center">
                  <p className="text-lg font-bold text-foreground leading-none">{hock.value ? (typeof hock.value === "number" || /^\d/.test(String(hock.value)) ? `${hock.value}°` : <span className="text-xs font-semibold leading-tight line-clamp-2">{hock.value}</span>) : "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Hock Flexion</p>
                  <div className="flex justify-center items-center gap-1 mt-1.5 h-[14px]">{hock.value && confBadge(hock.confidence)}</div>
                </div>
              </div>
            </div>

            {/* ── Row 3: Reach & Drive (2 columns) ── */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">Reach &amp; Drive</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center h-[82px] flex flex-col justify-center">
                  <p className="text-lg font-bold text-foreground leading-none">{frontReach.value != null ? `${frontReach.value}°` : "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Front Reach</p>
                  <div className="flex justify-center items-center gap-1 mt-1.5 h-[14px]">{frontReach.value != null && confBadge(frontReach.confidence)}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center h-[82px] flex flex-col justify-center">
                  <p className="text-lg font-bold text-foreground leading-none">{rearDrive.value != null ? `${rearDrive.value}°` : "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Rear Drive</p>
                  <div className="flex justify-center items-center gap-1 mt-1.5 h-[14px]">{rearDrive.value != null && confBadge(rearDrive.confidence)}</div>
                </div>
              </div>
            </div>

            {/* ── Calibration (Section 0) ── */}
            {breezeResult.calibration && (
              <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase tracking-wider text-secondary/80 font-semibold">Calibration</p>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    {breezeResult.calibration.method === "A_rail_posts" ? "Method A" :
                     breezeResult.calibration.method === "B_horse_height" ? "Method B" : "None"}
                  </Badge>
                </div>
                <p className="text-[11px] text-foreground/90 leading-snug">{breezeResult.calibration.detail}</p>
                {breezeResult.calibration.scaleMperPx && (
                  <p className="text-[10px] text-muted-foreground mt-1">Scale: {breezeResult.calibration.scaleMperPx.toFixed(5)} m/px</p>
                )}
              </div>
            )}

            {/* ── Row 3b: Estimated Speed (only when actually computed) ── */}
            {breezeResult.estimatedSpeedKmh != null && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">Estimated Speed</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/10 rounded-lg p-3 text-center h-[82px] flex flex-col justify-center border border-secondary/20">
                    <p className="text-lg font-bold text-secondary leading-none">
                      {breezeResult.estimatedSpeedKmh}
                      <span className="text-xs font-normal text-muted-foreground"> km/h</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1.5">Speed (metric)</p>
                    <div className="flex justify-center items-center gap-1 mt-1.5 h-[14px]">{confBadge(speedConf)}</div>
                  </div>
                  <div className="bg-secondary/10 rounded-lg p-3 text-center h-[82px] flex flex-col justify-center border border-secondary/20">
                    <p className="text-lg font-bold text-secondary leading-none">
                      {breezeResult.estimatedSpeedMph}
                      <span className="text-xs font-normal text-muted-foreground"> mph</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1.5">Speed (imperial)</p>
                    <div className="h-[14px] mt-1.5" />
                  </div>
                </div>
                {breezeResult.speedChain && (
                  <div className="mt-2 rounded-md bg-muted/40 border border-border p-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Calculation Chain</p>
                    <p className="text-[11px] font-mono text-foreground/90 leading-snug">{breezeResult.speedChain.formula}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      a) stride = {breezeResult.speedChain.strideLengthM} m · b) freq = {breezeResult.speedChain.strideFreqPerMin}/min · c) {breezeResult.speedChain.strideFreqPerSec}/s · d) {breezeResult.speedChain.mPerSec} m/s · e) {breezeResult.speedChain.kmh} km/h · f) {breezeResult.speedChain.mph} mph
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Row 4: Qualitative observations (2 columns) ── */}
            {(breezeResult.suspensionQuality || breezeResult.symmetryRating) && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">Movement Quality</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {breezeResult.suspensionQuality && (
                    <div className="bg-muted/30 rounded-lg p-3 flex flex-col">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Suspension</p>
                      <p className="text-xs font-medium text-foreground leading-relaxed">{breezeResult.suspensionQuality}</p>
                    </div>
                  )}
                  {breezeResult.symmetryRating && (
                    <div className="bg-muted/30 rounded-lg p-3 flex flex-col">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Symmetry</p>
                      <p className="text-xs font-medium text-foreground leading-relaxed">{breezeResult.symmetryRating}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gallop Score & Eye-Catching */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
              <div className="bg-secondary/10 rounded-lg p-3 text-center border border-secondary/20">
                <p className="text-lg font-bold text-secondary">{breezeResult.gallopScore ?? "—"}<span className="text-xs font-normal text-muted-foreground">/10</span></p>
                <p className="text-[10px] text-muted-foreground">Gallop Score</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center flex flex-col items-center justify-center gap-1">
                <div className="flex items-center justify-center gap-0.5">
                  {(() => {
                    const raw = Number(breezeResult.eyeCatchingRating) || 0;
                    const rating = Math.max(0, Math.min(5, raw > 5 ? Math.round(raw / 2) : Math.round(raw)));
                    return Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"}`}
                      />
                    ));
                  })()}
                </div>
                <p className="text-[10px] text-muted-foreground">Eye-Catching Factor</p>
              </div>
              {breezeResult.soundnessFlag !== undefined && (
                <div className={`rounded-lg p-3 text-center flex flex-col items-center justify-center gap-1 ${breezeResult.soundnessFlag ? "bg-red-500/10 border border-red-500/20" : "bg-green-500/10 border border-green-500/20"}`}>
                  <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${breezeResult.soundnessFlag ? "text-red-600" : "text-green-600"}`}>
                    {breezeResult.soundnessFlag ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    {breezeResult.soundnessFlag ? "Flag" : "Sound"}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Soundness</p>
                </div>
              )}
            </div>

            {/* Distance Prediction */}
            {breezeResult.distancePrediction && (
              <div className="pt-3 border-t border-border">
                <h4 className="text-xs font-semibold text-secondary mb-2">Distance Prediction</h4>
                <div className={`grid gap-2 ${breezeResult.distancePrediction.middle !== undefined ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground">{breezeResult.distancePrediction.sprint ?? 0}%</p>
                    <p className="text-[10px] text-muted-foreground">Sprint (5-6f)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground">{breezeResult.distancePrediction.mile ?? 0}%</p>
                    <p className="text-[10px] text-muted-foreground">Mile (7-8f)</p>
                  </div>
                  {breezeResult.distancePrediction.middle !== undefined && (
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">{breezeResult.distancePrediction.middle ?? 0}%</p>
                      <p className="text-[10px] text-muted-foreground">Middle (9f)</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground">{breezeResult.distancePrediction.classic ?? 0}%</p>
                    <p className="text-[10px] text-muted-foreground">Classic (10f+)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Score Dashboard removed — Biomechanical Scorecard (Weighted) is the single source of truth */}

            {/* Verdict */}
            {breezeResult.verdict && (
              <div className={`rounded-lg p-4 border ${
                breezeResult.verdictCategory === "Exceptional" ? "bg-green-500/10 border-green-500/20" :
                breezeResult.verdictCategory === "Above average" ? "bg-secondary/10 border-secondary/20" :
                breezeResult.verdictCategory === "Flag" ? "bg-red-500/10 border-red-500/20" :
                "bg-muted/30 border-border"
              }`}>
                <h4 className="text-xs font-semibold text-secondary mb-1">Breeze Verdict</h4>
                <p className="text-sm text-foreground leading-relaxed">{breezeResult.verdict}</p>
                {breezeResult.verdictCategory && (
                  <Badge variant="outline" className="mt-2 text-xs">{breezeResult.verdictCategory}</Badge>
                )}
              </div>
            )}

            {/* ── Weighted Biomechanical Scorecard (Section 5) ── */}
            {breezeResult.scorecardComputed && (
              <div className="pt-3 border-t border-border" data-pdf-chart="breeze-scores">
                <h4 className="text-xs font-semibold text-secondary mb-2">Biomechanical Scorecard (Weighted)</h4>
                <div className="rounded-lg border border-border overflow-hidden">
                  {[
                    { k: "strideMechanics", label: "Stride Mechanics", w: 25 },
                    { k: "bodyAngles", label: "Body Angles", w: 20 },
                    { k: "reachDrive", label: "Reach & Drive", w: 25 },
                    { k: "movementQuality", label: "Movement Quality", w: 15 },
                    { k: "gaitEfficiency", label: "Gait Efficiency", w: 10 },
                    { k: "hoofHealth", label: "Hoof Health", w: 5 },
                  ].map((row) => {
                    const v = breezeResult.scorecardComputed[row.k] as number;
                    return (
                      <div key={row.k} className="flex items-center gap-3 px-3 py-2 border-b border-border/50 last:border-0">
                        <span className="flex-1 text-xs text-foreground">{row.label} <span className="text-muted-foreground">({row.w}%)</span></span>
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${progressColor(v)}`} style={{ width: `${v}%` }} />
                        </div>
                        <span className={`text-xs font-bold w-12 text-right ${scoreColor(v)}`}>{v}/100</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-secondary/10">
                    <span className="flex-1 text-xs font-bold text-secondary">OVERALL</span>
                    <div className="w-24 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${progressColor(breezeResult.scorecardComputed.overall)}`} style={{ width: `${breezeResult.scorecardComputed.overall}%` }} />
                    </div>
                    <span className={`text-sm font-bold w-12 text-right ${scoreColor(breezeResult.scorecardComputed.overall)}`}>{breezeResult.scorecardComputed.overall}/100</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Commercial Verdict (Section 7) ── */}
            {(breezeResult.racingSuitability || breezeResult.tierProfile) && (
              <div className="pt-3 border-t border-border space-y-2">
                <h4 className="text-xs font-semibold text-secondary">Commercial Verdict</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/40 border border-border p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Racing Suitability</p>
                    <p className="text-sm font-bold text-foreground mt-1">{breezeResult.racingSuitability}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 border border-border p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Comparable Profile</p>
                    <p className="text-sm font-bold text-foreground mt-1">{breezeResult.tierProfile}</p>
                  </div>
                </div>
                {breezeResult.watchPoints?.length > 0 && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-1">Vet / Buyer Watch Points</p>
                    <ul className="space-y-0.5">
                      {breezeResult.watchPoints.map((w: string, i: number) => (
                        <li key={i} className="text-[11px] text-foreground/90">• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Full Analysis Text */}
            {(breezeResult.fullAnalysisText || breezeResult.biomechanicsAnalysis) && (
              <div className="pt-3 border-t border-border">
                <h4 className="text-xs font-semibold text-secondary mb-2">Detailed Biomechanics Analysis</h4>
                <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-lg p-4 border border-border max-h-96 overflow-y-auto">
                  {breezeResult.fullAnalysisText || breezeResult.biomechanicsAnalysis}
                </div>
              </div>
            )}

            {/* Strengths & Concerns */}
            {(breezeResult.strengths?.length > 0 || breezeResult.concerns?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
                {breezeResult.strengths?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-green-600 mb-1">✅ Strengths</h4>
                    <ul className="space-y-0.5">
                      {breezeResult.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-[11px] text-muted-foreground">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {breezeResult.concerns?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-red-500 mb-1">⚠️ Concerns</h4>
                    <ul className="space-y-0.5">
                      {breezeResult.concerns.map((c: string, i: number) => (
                        <li key={i} className="text-[11px] text-muted-foreground">• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-[10px] text-muted-foreground italic pt-2 border-t border-border">
              ⚠️ Speed and stride estimates are derived from visual frame analysis and should be treated as approximations only. This analysis does not replace physical veterinary examination.
            </p>
          </CardContent>
        </Card>
        );
      })()}

      {/* Section — Run Breeze-Up Analysis */}
      <Button
        onClick={handleRunAnalysis}
        disabled={(!sire || !dam) || analysing}
        variant="premium"
        className="w-full"
        size="lg"
      >
        {analysing ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing...</>
        ) : (
          <><Search className="w-4 h-4 mr-2" /> Run Breeze-Up Analysis {mediaFile ? "(+ Visual)" : ""}</>
        )}
      </Button>

      {/* Progress */}
      {progress && (
        <div className="space-y-2 bg-accent/10 rounded-lg p-4">
          <p className="text-sm font-medium">{progress.stage}</p>
          <Progress value={progress.percent} className="h-2" />
        </div>
      )}

      {/* ═══ VISUAL ASSESSMENT SCORES ═══ */}
      {visualResult && visualMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              🐎 Visual Assessment Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Speed Potential", value: visualMetrics.speedPotential },
              { label: "Stride Efficiency", value: visualMetrics.strideEfficiency },
              { label: "Biomechanics", value: visualMetrics.biomechanics },
              { label: "Temperament", value: visualMetrics.temperament },
              { label: "Athleticism", value: visualMetrics.athleticism },
              { label: "Physical Maturity", value: visualMetrics.physicalMaturity },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{label}</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`font-bold ${scoreColor(value)}`}>{value}/100</span>
                    <span>{scoreDot(value)}</span>
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor(value)}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-base sm:text-lg font-bold text-secondary">{visualScores?.overall ?? "—"}<span className="text-[10px] sm:text-xs font-normal text-muted-foreground">/100</span></p>
                <p className="text-[10px] text-muted-foreground">Bloodstock Rating</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-sm font-bold text-foreground">{visualResult?.verdict?.includes("Elevated") ? "Elevated" : visualResult?.verdict?.includes("Moderate") ? "Moderate" : "Low"}</p>
                <p className="text-[10px] text-muted-foreground">Injury Risk</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-sm font-bold text-foreground">{visualScores?.conformation >= 70 ? "Strong" : visualScores?.conformation >= 50 ? "Moderate" : "Limited"}</p>
                <p className="text-[10px] text-muted-foreground">Auction Potential</p>
              </div>
            </div>

            {visualResult?.analysis && (
              <div className="pt-3 border-t border-border">
                <h4 className="text-xs font-semibold text-secondary mb-2">Detailed Assessment</h4>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{visualResult.analysis}</p>
              </div>
            )}

            {(visualResult?.strengths?.length > 0 || visualResult?.concerns?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
                {visualResult.strengths?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-green-600 mb-1">✅ Strengths</h4>
                    <ul className="space-y-0.5">
                      {visualResult.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-[11px] text-muted-foreground">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {visualResult.concerns?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-red-500 mb-1">⚠️ Concerns</h4>
                    <ul className="space-y-0.5">
                      {visualResult.concerns.map((c: string, i: number) => (
                        <li key={i} className="text-[11px] text-muted-foreground">• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ COMBINED ASSESSMENT ═══ */}
      {combinedResult && (
        <Card className="border-secondary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              🧬 Combined Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className={`text-lg font-bold ${scoreColor(combinedResult.geneticScore || 0)}`}>
                  {combinedResult.geneticScore || "—"}<span className="text-xs font-normal text-muted-foreground">/100</span>
                </p>
                <p className="text-[10px] text-muted-foreground">Genetic Score</p>
                <span className="text-xs">{scoreDot(combinedResult.geneticScore || 0)}</span>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p className={`text-lg font-bold ${scoreColor(combinedResult.visualScore || 0)}`}>
                  {combinedResult.visualScore || "—"}<span className="text-xs font-normal text-muted-foreground">/100</span>
                </p>
                <p className="text-[10px] text-muted-foreground">Visual Score</p>
                <span className="text-xs">{scoreDot(combinedResult.visualScore || 0)}</span>
              </div>
              <div className="bg-secondary/10 rounded-lg p-3 text-center border border-secondary/20">
                <p className={`text-lg font-bold ${scoreColor(combinedResult.overallScore || 0)}`}>
                  {combinedResult.overallScore || "—"}<span className="text-xs font-normal text-muted-foreground">/100</span>
                </p>
                <p className="text-[10px] text-muted-foreground">Combined Overall</p>
                <span className="text-xs">{scoreDot(combinedResult.overallScore || 0)}</span>
              </div>
            </div>

            {combinedResult.combinedVerdict && (
              <p className="text-sm text-foreground leading-relaxed">{combinedResult.combinedVerdict}</p>
            )}

            {combinedResult.recommendedMaxBid && (
              <div className="bg-secondary/10 rounded-lg p-3 border border-secondary/20">
                <p className="text-xs text-muted-foreground">Recommended Maximum Bid</p>
                <p className="text-lg font-bold text-secondary">{combinedResult.recommendedMaxBid}</p>
              </div>
            )}

            {combinedResult.adjustedRecommendation && (
              <Badge
                variant={combinedResult.adjustedRecommendation === "BID" ? "default" : "outline"}
                className={`text-sm px-3 py-1 ${
                  combinedResult.adjustedRecommendation === "BID" ? "bg-green-600 hover:bg-green-700" :
                  combinedResult.adjustedRecommendation === "WATCH" ? "bg-yellow-600 hover:bg-yellow-700 text-white" :
                  "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {combinedResult.adjustedRecommendation === "BID" ? "✅" : combinedResult.adjustedRecommendation === "WATCH" ? "👁" : "❌"}{" "}
                {combinedResult.adjustedRecommendation}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 4 — Pedigree Results */}
      {result && (
        <div className="space-y-4">
          {exec && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground leading-relaxed">{exec}</p>
              </CardContent>
            </Card>
          )}

          {pedigree && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pedigree Assessment — Grade: {pedigree.overallGrade || "N/A"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pedigree.sireLine && (
                  <div>
                    <h4 className="text-xs font-semibold text-secondary mb-1">Sire Line</h4>
                    <p className="text-xs text-muted-foreground">{pedigree.sireLine}</p>
                  </div>
                )}
                {pedigree.damLine && (
                  <div>
                    <h4 className="text-xs font-semibold text-secondary mb-1">Dam Line</h4>
                    <p className="text-xs text-muted-foreground">{pedigree.damLine}</p>
                  </div>
                )}
                {pedigree.dosage && (
                  <div>
                    <h4 className="text-xs font-semibold text-secondary mb-1">Dosage</h4>
                    <p className="text-xs text-muted-foreground">
                      DI: {pedigree.dosage.index} | CD: {pedigree.dosage.cd} | {pedigree.dosage.interpretation}
                    </p>
                  </div>
                )}
                {pedigree.inbreeding && (
                  <div>
                    <h4 className="text-xs font-semibold text-secondary mb-1">Inbreeding</h4>
                    <p className="text-xs text-muted-foreground">
                      {pedigree.inbreeding.pattern} — {pedigree.inbreeding.assessment} (CoI: {pedigree.inbreeding.coefficient}%)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {performance && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {performance.trueRating && (
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-secondary">{performance.trueRating}</p>
                      <p className="text-[10px] text-muted-foreground">{performance.ratingSystem || "Rating"}</p>
                    </div>
                  )}
                  {performance.performanceGrade && (
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-sm font-bold text-foreground">{performance.performanceGrade}</p>
                      <p className="text-[10px] text-muted-foreground">Class</p>
                    </div>
                  )}
                  {performance.optimalConditions?.distance && (
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-sm font-bold text-foreground">{performance.optimalConditions.distance}</p>
                      <p className="text-[10px] text-muted-foreground">Distance</p>
                    </div>
                  )}
                  {performance.optimalConditions?.surface && (
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-sm font-bold text-foreground">{performance.optimalConditions.surface}</p>
                      <p className="text-[10px] text-muted-foreground">Surface</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {commercial && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Market Analysis & Bidding Strategy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {commercial.currentMarketValue && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-sm font-bold text-foreground">
                        {commercial.currentMarketValue.currency} {commercial.currentMarketValue.low?.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Low Estimate</p>
                    </div>
                    <div className="bg-secondary/10 rounded-lg p-3 text-center border border-secondary/20">
                      <p className="text-sm font-bold text-secondary">Target</p>
                      <p className="text-[10px] text-muted-foreground">Recommended Bid</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-sm font-bold text-foreground">
                        {commercial.currentMarketValue.currency} {commercial.currentMarketValue.high?.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Walk Away</p>
                    </div>
                  </div>
                )}
                {commercial.marketTrend && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Market Trend:</span> {commercial.marketTrend}
                  </p>
                )}
                {commercial.marketCommentary && (
                  <p className="text-xs text-muted-foreground">{commercial.marketCommentary}</p>
                )}
              </CardContent>
            </Card>
          )}

          {risks && risks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {risks.map((r: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Badge variant={r.severity === "High" ? "destructive" : "outline"} className="text-[10px] shrink-0 mt-0.5">
                        {r.severity}
                      </Badge>
                      <div>
                        <p className="font-medium text-foreground">{r.risk}</p>
                        {r.mitigation && <p className="text-muted-foreground">{r.mitigation}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {recs && recs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Final Verdict & Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {recs.map((r: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-secondary mt-0.5">•</span> {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Score Dashboard removed — Biomechanical Scorecard (Weighted) is the single source of truth */}

          {/* ═══ DOWNLOAD SECTION ═══ */}
        </div>
      )}

      {/* ═══ DOWNLOAD SECTION (always visible when ANY result exists) ═══ */}
      {(result || breezeResult || combinedResult || visualResult) && (
        <Card className="border-secondary/40 bg-gradient-to-br from-secondary/10 to-background shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileDown className="w-5 h-5 text-secondary" />
              Download Complete Report
            </CardTitle>
            <CardDescription>
              Download the full Breeze-Up Analysis as a premium PDF report — includes annotated stride frames (when video uploaded), biomechanical data, pedigree assessment and commercial valuation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="premium"
              size="lg"
              className="gap-2 w-full text-sm font-semibold"
              onClick={() => {
                generateBreezeUpPDF({
                  horseName, lotNumber, sire, dam, saleName,
                  breezeResult, pedigreeResult: result, visualResult, combinedResult,
                  annotatedFrames,
                });
                toast({ title: "PDF Generated!", description: "Your premium Breeze-Up Analysis report is downloading." });
              }}
            >
              <FileDown className="w-5 h-5 shrink-0" />
              Download Premium PDF Report{annotatedFrames.length > 0 ? " (with Frames)" : ""}
            </Button>
            {annotatedFrames.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5 w-full text-xs" onClick={() => {
                annotatedFrames.forEach((f) => {
                  const a = document.createElement("a");
                  a.href = f.annotatedDataUrl;
                  a.download = `BreezeUp_Frame${f.frameIndex + 1}_${(horseName || "horse").replace(/\s+/g, "_")}.jpg`;
                  a.click();
                });
                toast({ title: "Frames Downloaded", description: `${annotatedFrames.length} annotated frames saved.` });
              }}>
                <Download className="w-4 h-4 shrink-0" /> Download Annotated Frames (JPG)
              </Button>
            )}
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              PDF includes: Cover · Executive summary · {annotatedFrames.length > 0 ? `${annotatedFrames.length} annotated stride frames · ` : ""}Biomechanical analysis · Pedigree · Commercial profile · Final verdict
            </p>
          </CardContent>
        </Card>
      )}

      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} type={paywallType} />
    </div>
  );
};
