import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const MAX_BYTES = 200 * 1024 * 1024; // 200MB hard cap
const ALLOWED_EXT = ["mp4", "mov", "m4v", "qt", "webm", "mkv", "avi"];
const BUCKET = "training-videos";

function detectSource(rawUrl: string): { kind: string; url: string } {
  let u: URL;
  try { u = new URL(rawUrl); } catch { throw new Error("Invalid URL"); }
  const host = u.hostname.toLowerCase();

  // YouTube — not supported (terms of service)
  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    const err: any = new Error("YouTube links are not supported. Please download the original video and upload it directly, or use a public MP4/Drive/Dropbox/S3/R2 link.");
    err.code = "UNSUPPORTED_SOURCE";
    throw err;
  }

  // Google Drive → direct download
  if (host.includes("drive.google.com")) {
    const m1 = u.pathname.match(/\/file\/d\/([^/]+)/);
    const id = m1?.[1] || u.searchParams.get("id");
    if (!id) throw new Error("Could not parse Google Drive file ID");
    return { kind: "gdrive", url: `https://drive.google.com/uc?export=download&id=${id}&confirm=t` };
  }

  // Dropbox → force direct download
  if (host.includes("dropbox.com")) {
    const url = new URL(rawUrl);
    url.searchParams.set("dl", "1");
    return { kind: "dropbox", url: url.toString() };
  }

  // Vimeo — only if user pasted a direct CDN URL (player.vimeo.com/external/...mp4) — we don't bypass auth
  if (host.includes("vimeo.com") && !host.includes("player.vimeo.com")) {
    const err: any = new Error("Vimeo page URLs require authorized API access. Paste a direct MP4 URL or upload the file.");
    err.code = "UNSUPPORTED_SOURCE";
    throw err;
  }

  // Supabase Storage / R2 / S3 / generic direct URL
  return { kind: "direct", url: rawUrl };
}

function extFromUrlOrType(url: string, contentType: string | null): string {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("mp4")) return "mp4";
  if (ct.includes("quicktime")) return "mov";
  if (ct.includes("webm")) return "webm";
  if (ct.includes("matroska")) return "mkv";
  const m = url.toLowerCase().match(/\.([a-z0-9]{2,4})(?:\?|#|$)/);
  if (m && ALLOWED_EXT.includes(m[1])) return m[1];
  return "mp4";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const action: string = (body?.action || "fetch").toString();

    // Cleanup action — delete a temp file that the client has already materialised.
    // Only allows deletion of objects under temp/<user.id>/ in the training-videos bucket.
    if (action === "cleanup") {
      const storagePath: string = (body?.storage_path || "").toString();
      if (!storagePath || !storagePath.startsWith(`temp/${user.id}/`)) {
        return new Response(JSON.stringify({ error: "Invalid storage_path" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      const del = await admin.storage.from(BUCKET).remove([storagePath]);
      if (del.error) {
        console.error("cleanup error", del.error);
        return new Response(JSON.stringify({ error: "Could not delete the temp file." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rawUrl: string = (body?.url || "").toString().trim();
    const moduleHint: string = (body?.module || "shared").toString();
    if (!rawUrl) {
      return new Response(JSON.stringify({ error: "Missing url" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { kind, url } = detectSource(rawUrl);

    // HEAD first when possible to check size/type
    let headResp: Response | null = null;
    try {
      headResp = await fetch(url, { method: "HEAD", redirect: "follow" });
    } catch { /* some hosts disallow HEAD; fall through */ }

    if (headResp && headResp.ok) {
      const len = Number(headResp.headers.get("content-length") || 0);
      if (len && len > MAX_BYTES) {
        return new Response(JSON.stringify({ error: "This video is too large. Please upload a shorter clip or compress the file." }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // GET stream
    const resp = await fetch(url, { redirect: "follow" });
    if (!resp.ok || !resp.body) {
      return new Response(JSON.stringify({ error: "We could not access this video. Please make sure the link is public or upload the video file directly." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ct = resp.headers.get("content-type");
    // basic mime guard — reject obviously-non-video HTML responses
    if (ct && (ct.includes("text/html") || ct.includes("application/xhtml"))) {
      return new Response(JSON.stringify({ error: "We could not access this video. Please make sure the link is public or upload the video file directly." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Stream into memory with size cap
    const reader = resp.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_BYTES) {
          try { await reader.cancel(); } catch { /* ignore */ }
          return new Response(JSON.stringify({ error: "This video is too large. Please upload a shorter clip or compress the file." }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        chunks.push(value);
      }
    }
    const bytes = new Uint8Array(total);
    { let off = 0; for (const c of chunks) { bytes.set(c, off); off += c.byteLength; } }

    const ext = extFromUrlOrType(url, ct);
    if (!ALLOWED_EXT.includes(ext)) {
      return new Response(JSON.stringify({ error: "This video source is not currently supported. Please use a direct MP4, Google Drive, Dropbox, Supabase, R2 or S3 link." }), { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const objectPath = `temp/${user.id}/${moduleHint}/${crypto.randomUUID()}.${ext}`;
    const contentType = ct && !ct.includes("octet-stream") ? ct : `video/${ext === "mov" ? "quicktime" : ext}`;

    const up = await admin.storage.from(BUCKET).upload(objectPath, bytes, {
      contentType, upsert: false,
    });
    if (up.error) {
      console.error("upload error", up.error);
      return new Response(JSON.stringify({ error: "Could not store the fetched video." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const signed = await admin.storage.from(BUCKET).createSignedUrl(objectPath, 60 * 60); // 1h
    if (signed.error || !signed.data?.signedUrl) {
      return new Response(JSON.stringify({ error: "Could not sign the fetched video URL." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      signed_url: signed.data.signedUrl,
      storage_path: objectPath,
      bucket: BUCKET,
      size_bytes: total,
      content_type: contentType,
      ext,
      source_kind: kind,
      filename: `imported.${ext}`,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    const code = e?.code === "UNSUPPORTED_SOURCE" ? 415 : 400;
    const msg = e?.message || "We could not access this video. Please make sure the link is public or upload the video file directly.";
    return new Response(JSON.stringify({ error: msg }), { status: code, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});