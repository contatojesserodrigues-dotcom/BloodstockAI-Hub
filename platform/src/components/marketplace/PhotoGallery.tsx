import { useState } from "react";
import { Play, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  photos: string[];
  videoUrl?: string | null;
  alt: string;
  className?: string;
}

const HorseSilhouette = () => (
  <svg viewBox="0 0 64 64" className="h-24 w-24 text-muted-foreground/40" fill="currentColor" aria-hidden="true">
    <path d="M54 22c-1-3-4-5-7-4l-6 2-3-4c-2-3-6-4-9-3l-12 4c-2 1-3 3-3 5v3l-4 2c-2 1-3 3-2 5l2 4c1 2 3 3 5 2v10c0 1 1 2 2 2h3c1 0 2-1 2-2v-7h14v7c0 1 1 2 2 2h3c1 0 2-1 2-2V31l5-2c3-1 5-4 6-7z" />
  </svg>
);

export const PhotoGallery = ({ photos, videoUrl, alt, className }: Props) => {
  const items = [...photos];
  const [active, setActive] = useState<{ type: "image" | "video"; src: string }>(
    photos.length ? { type: "image", src: photos[0] } : { type: "image", src: "" }
  );
  const [showVideo, setShowVideo] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  if (!photos.length && !videoUrl) {
    return (
      <div className={cn("aspect-[4/3] bg-muted rounded-lg flex items-center justify-center text-muted-foreground", className)}>
        <HorseSilhouette />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden border border-border/50">
        {showVideo && videoUrl ? (
          videoUrl.includes("youtu") ? (
            <iframe
              src={videoUrl.replace("watch?v=", "embed/")}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : (
            <video src={videoUrl} controls className="w-full h-full" />
          )
        ) : (
          active.src ? (
            <img
              src={active.src}
              alt={alt}
              onClick={() => setLightbox(true)}
              className="w-full h-full object-cover cursor-zoom-in"
            />
          ) : <div className="w-full h-full flex items-center justify-center"><HorseSilhouette /></div>
        )}
      </div>
      {(items.length > 1 || videoUrl) && <div className="flex gap-2 overflow-x-auto pb-1">
        {items.slice(0, 6).map((p) => (
          <button
            key={p}
            onClick={() => { setShowVideo(false); setActive({ type: "image", src: p }); }}
            className={`shrink-0 w-20 h-[60px] rounded overflow-hidden border-2 transition ${active.src === p && !showVideo ? "border-secondary" : "border-border/50 opacity-70 hover:opacity-100"}`}
          >
            <img src={p} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
        {videoUrl && (
          <button
            onClick={() => setShowVideo(true)}
            className={`shrink-0 w-20 h-[60px] rounded overflow-hidden border-2 bg-muted flex items-center justify-center transition ${showVideo ? "border-secondary" : "border-border/50 opacity-70 hover:opacity-100"}`}
          >
            <Play className="w-6 h-6 text-secondary" />
          </button>
        )}
      </div>}
      {lightbox && active.src && (
        <div
          onClick={() => { setLightbox(false); setZoomed(false); }}
          className="fixed inset-0 z-[100] bg-black/95 overflow-auto animate-in fade-in"
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(false); setZoomed(false); }}
            className="fixed top-4 right-4 z-[101] text-white bg-black/60 hover:bg-black/80 rounded-full p-2"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="min-h-full w-full flex items-start justify-center p-4">
            <img
              src={active.src}
              alt={alt}
              onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
              className={cn(
                "rounded-lg shadow-2xl transition-all",
                zoomed
                  ? "max-w-none w-auto cursor-zoom-out"
                  : "max-w-full w-auto h-auto cursor-zoom-in"
              )}
              style={zoomed ? { width: "180%" } : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;