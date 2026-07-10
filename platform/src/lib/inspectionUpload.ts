import { supabase } from "@/integrations/supabase/client";

export async function uploadInspectionVideo(input: {
  userId: string;
  analysisId: string;
  blockId: string;
  file: File;
  mediaPurpose?: string;
}): Promise<string | null> {
  const ext = input.file.name.split(".").pop() || "mp4";
  const path = `${input.userId}/${input.analysisId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("inspection-videos")
    .upload(path, input.file, { contentType: input.file.type || "video/mp4", upsert: false });

  if (upErr) {
    console.warn("[inspectionUpload] storage upload failed", upErr.message);
    return null;
  }

  const { data: signed } = await supabase.storage
    .from("inspection-videos")
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  const url = signed?.signedUrl || null;

  const videoType = /WALK/i.test(input.mediaPurpose || "") ? "walk"
    : /TROT/i.test(input.mediaPurpose || "") ? "trot"
    : /GALLOP/i.test(input.mediaPurpose || "") ? "gallop"
    : /BREEZE/i.test(input.mediaPurpose || "") ? "breeze"
    : "general";

  await (supabase as any).from("inspection_videos").insert({
    analysis_id: input.analysisId,
    block_id: input.blockId,
    user_id: input.userId,
    storage_path: path,
    public_url: url,
    video_type: videoType,
    mime_type: input.file.type,
    file_size_bytes: input.file.size,
    status: "uploaded",
  });

  if (url) {
    const { data: block } = await (supabase as any)
      .from("inspection_blocks")
      .select("file_urls")
      .eq("id", input.blockId)
      .maybeSingle();
    const urls = [...(block?.file_urls || []), url];
    await (supabase as any).from("inspection_blocks").update({ file_urls: urls }).eq("id", input.blockId);
  }

  return url;
}

export async function runInspectionEngine(input: {
  analysisId: string;
  blockId: string;
  frames: Array<{
    index: number;
    timestampMs: number;
    keypoints?: Record<string, { x: number; y: number }> | null;
    angles?: Record<string, number | null>;
    stridePhase?: string;
    confidence?: number;
  }>;
  fps?: number;
  persistFrames?: boolean;
}) {
  return supabase.functions.invoke("inspection-engine", {
    body: {
      analysis_id: input.analysisId,
      block_id: input.blockId,
      frames: input.frames,
      fps: input.fps ?? 6,
      persist_frames: input.persistFrames ?? true,
    },
  });
}
