/**
 * Client-side HTML5 video → JPEG base64 frame extraction.
 * Frames are extracted at given percentages of the video duration.
 * Returns an array of data-URL JPEG strings ("data:image/jpeg;base64,...").
 *
 * Used so the edge function never receives raw video — only small JPEGs.
 */
export async function extractVideoFrames(
  file: File,
  percents: number[] = [0, 0.15, 0.3, 0.5, 0.7, 0.9],
  opts: { maxWidth?: number; quality?: number } = {},
): Promise<string[]> {
  const maxWidth = opts.maxWidth ?? 1024;
  const quality = opts.quality ?? 0.82;

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Failed to load video"));
      // hint
      setTimeout(() => reject(new Error("Video load timeout")), 30_000);
    });

    const duration = isFinite(video.duration) ? video.duration : 0;
    if (!duration) return [];

    const canvas = document.createElement("canvas");
    const ratio = video.videoWidth > maxWidth ? maxWidth / video.videoWidth : 1;
    canvas.width = Math.round(video.videoWidth * ratio);
    canvas.height = Math.round(video.videoHeight * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    const frames: string[] = [];
    for (const pct of percents) {
      const t = Math.min(duration - 0.05, Math.max(0, duration * pct));
      await new Promise<void>((resolve) => {
        const onSeek = () => {
          video.removeEventListener("seeked", onSeek);
          resolve();
        };
        video.addEventListener("seeked", onSeek);
        video.currentTime = t;
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", quality));
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Read a File (image) as JPEG data URL, resized to <= maxWidth. */
export async function fileToCompressedDataUrl(
  file: File,
  maxWidth = 1280,
  quality = 0.85,
): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Failed to load image"));
      i.src = url;
    });
    const ratio = img.naturalWidth > maxWidth ? maxWidth / img.naturalWidth : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * ratio);
    canvas.height = Math.round(img.naturalHeight * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas ctx");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}