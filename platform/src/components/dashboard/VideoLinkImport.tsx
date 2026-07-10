import { useState } from "react";
import { Loader2, Link2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const STAGES = [
  "Validating link",
  "Fetching video",
  "Saving temporary file",
  "Preparing for analysis",
] as const;

interface Props {
  /** Called with the materialised File once the remote video has been pulled into the backend
   *  and re-downloaded to the browser. The receiving module then runs its existing pipeline
   *  exactly as if the user had uploaded the file from disk. */
  onFile: (file: File) => void;
  disabled?: boolean;
  /** Optional tag forwarded to the edge function so temp files are grouped per module. */
  module?: "breezeup" | "visual" | "visual-legacy" | "training" | "shared";
  className?: string;
}

export function VideoLinkImport({ onFile, disabled, module = "shared", className }: Props) {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);

  async function importNow() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setBusy(true);
    setStageIdx(0);
    try {
      // Stage 0: validating (client-side smoke test)
      try { new URL(trimmed); } catch {
        throw new Error("Please paste a valid URL.");
      }
      // YouTube is blocked by ToS / not technically feasible from edge runtime — explain clearly upfront.
      if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/i.test(new URL(trimmed).hostname)) {
        throw new Error("YouTube links can't be imported (their terms of service forbid direct downloading). Please download the original video from YouTube and upload the file, or paste a direct MP4 / Google Drive / Dropbox / Supabase / R2 / S3 link.");
      }
      setStageIdx(1);

      // Stage 1+2: backend fetches + stores
      const { data, error } = await supabase.functions.invoke("fetch-remote-video", {
        body: { url: trimmed, module },
      });
      if (error) {
        // FunctionsHttpError hides the response body — pull it out so the user sees the real reason.
        let detail = "";
        try {
          const ctx: any = (error as any)?.context;
          if (ctx && typeof ctx.json === "function") {
            const parsed = await ctx.json();
            detail = parsed?.error || "";
          } else if (ctx && typeof ctx.text === "function") {
            const t = await ctx.text();
            try { detail = JSON.parse(t)?.error || t; } catch { detail = t; }
          }
        } catch { /* ignore */ }
        throw new Error(detail || error.message || "Could not fetch the video.");
      }
      const signed = data?.signed_url as string | undefined;
      const ext = (data?.ext as string | undefined) || "mp4";
      const contentType = (data?.content_type as string | undefined) || "video/mp4";
      const filename = (data?.filename as string | undefined) || `imported.${ext}`;
      const storagePath = data?.storage_path as string | undefined;
      if (!signed) throw new Error("Backend did not return a video URL.");

      setStageIdx(2);
      // Stage 3: download materialised file into the browser so the existing
      // frame-extraction pipeline (HTMLVideoElement + canvas) can process it.
      const blob = await fetch(signed).then(r => {
        if (!r.ok) throw new Error("Could not download the stored video.");
        return r.blob();
      });
      setStageIdx(3);

      const file = new File([blob], filename, { type: contentType });
      onFile(file);
      setUrl("");
      toast({ title: "Video imported", description: `${(file.size / 1024 / 1024).toFixed(1)} MB ready for analysis.` });

      // Fire-and-forget cleanup — the temp file in training-videos/temp/... is no longer needed
      // once the browser has the blob. This keeps storage from accumulating orphans when the
      // user later deletes the analysis (which never referenced the temp path in the first place).
      if (storagePath) {
        supabase.functions.invoke("fetch-remote-video", {
          body: { action: "cleanup", storage_path: storagePath },
        }).catch(() => { /* best-effort */ });
      }
    } catch (e: any) {
      toast({
        title: "Import failed",
        description: e?.message || "We could not access this video. Please make sure the link is public or upload the video file directly.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
      setStageIdx(0);
    }
  }

  const pct = busy ? Math.min(95, ((stageIdx + 1) / STAGES.length) * 100) : 0;

  return (
    <div className={`rounded-lg border border-dashed border-border bg-muted/30 p-3 space-y-2 ${className || ""}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <Link2 className="w-3.5 h-3.5 text-secondary" /> Or import from a public link
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://… (MP4, Google Drive, Dropbox, Supabase, R2, S3)"
          disabled={busy || disabled}
          className="h-9 text-sm"
        />
        <Button
          type="button"
          onClick={importNow}
          disabled={busy || disabled || !url.trim()}
          className="h-9 whitespace-nowrap"
          size="sm"
        >
          {busy ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Importing…</> : <><Download className="w-4 h-4 mr-1.5" />Import</>}
        </Button>
      </div>
      {busy && (
        <div className="space-y-1">
          <Progress value={pct} className="h-1.5" />
          <p className="text-[11px] text-muted-foreground">{STAGES[stageIdx]}…</p>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Supported: direct MP4, Google Drive, Dropbox, Supabase Storage, Cloudflare R2, AWS S3.
        YouTube links aren't supported — please upload the original file instead.
      </p>
    </div>
  );
}

export default VideoLinkImport;