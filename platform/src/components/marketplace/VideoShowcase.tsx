import { ExternalLink, Play } from "lucide-react";

export interface ShowcaseVideo {
  title?: string;
  url: string;
  provider?: "youtube" | "vimeo" | "external" | string;
  thumbnail?: string;
}

const ytId = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/\/embed\/([\w-]+)/);
      if (m) return m[1];
    }
  } catch { /* noop */ }
  return null;
};

const vimeoId = (url: string): string | null => {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
};

const hostnameOf = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
};

const VideoCard = ({ video }: { video: ShowcaseVideo }) => {
  const yt = ytId(video.url);
  const vm = vimeoId(video.url);

  if (yt) {
    return (
      <figure className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="relative aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${yt}?rel=0&modestbranding=1`}
            title={video.title || "Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            className="absolute inset-0 h-full w-full"
          />
        </div>
        {video.title && (
          <figcaption className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-sm">
            <span className="font-semibold text-foreground">{video.title}</span>
            <a href={video.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-secondary hover:underline">
              YouTube <ExternalLink className="h-3 w-3" />
            </a>
          </figcaption>
        )}
      </figure>
    );
  }

  if (vm) {
    return (
      <figure className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="relative aspect-video bg-black">
          <iframe
            src={`https://player.vimeo.com/video/${vm}`}
            title={video.title || "Video"}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="absolute inset-0 h-full w-full"
          />
        </div>
        {video.title && (
          <figcaption className="border-t border-border/60 px-4 py-3 text-sm font-semibold text-foreground">{video.title}</figcaption>
        )}
      </figure>
    );
  }

  // External (non-embeddable) — render as a premium link card with hover preview
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex aspect-video flex-col justify-between overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-foreground via-foreground to-secondary/30 p-5 text-background shadow-sm transition hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <span className="rounded-full bg-secondary/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
          {hostnameOf(video.url)}
        </span>
        <ExternalLink className="h-4 w-4 opacity-70 transition group-hover:opacity-100" />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/15 backdrop-blur transition group-hover:bg-background/25">
          <Play className="h-5 w-5 fill-background" />
        </div>
        <div>
          <div className="text-base font-semibold leading-tight">{video.title || "Watch video"}</div>
          <div className="text-xs opacity-80">Opens in a new tab</div>
        </div>
      </div>
    </a>
  );
};

export default function VideoShowcase({ videos }: { videos: ShowcaseVideo[] }) {
  if (!videos || videos.length === 0) return null;
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Featured Videos</h2>
        <div className="mt-2 h-px w-full bg-secondary/70" />
      </div>
      <div className={`grid gap-4 ${videos.length > 1 ? "md:grid-cols-2" : ""}`}>
        {videos.map((v, i) => <VideoCard key={i} video={v} />)}
      </div>
    </section>
  );
}