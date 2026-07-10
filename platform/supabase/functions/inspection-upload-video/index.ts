// ============================================================
// inspection-upload-video — persist raw inspection videos
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function videoTypeFromPurpose(purpose?: string): string {
  if (!purpose) return "general";
  if (/WALK/i.test(purpose)) return "walk";
  if (/TROT/i.test(purpose)) return "trot";
  if (/GALLOP/i.test(purpose)) return "gallop";
  if (/BREEZE/i.test(purpose)) return "breeze";
  return "general";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await req.json();
    const {
      analysis_id,
      block_id,
      file_base64,
      file_name,
      mime_type,
      media_purpose,
    } = body as {
      analysis_id: string;
      block_id?: string;
      file_base64: string;
      file_name: string;
      mime_type?: string;
      media_purpose?: string;
    };

    if (!analysis_id || !file_base64) {
      return new Response(JSON.stringify({ error: "analysis_id and file_base64 required" }), {
        status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const { data: analysis } = await admin
      .from("inspection_analyses")
      .select("id")
      .eq("id", analysis_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!analysis) {
      return new Response(JSON.stringify({ error: "Analysis not found" }), {
        status: 404, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const raw = file_base64.replace(/^data:[^;]+;base64,/, "");
    const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    const ext = (file_name || "video.mp4").split(".").pop() || "mp4";
    const path = `${user.id}/${analysis_id}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await admin.storage
      .from("inspection-videos")
      .upload(path, bytes, {
        contentType: mime_type || "video/mp4",
        upsert: false,
      });

    if (upErr) throw upErr;

    const { data: urlData } = admin.storage.from("inspection-videos").getPublicUrl(path);
    // Signed URL for private bucket
    const { data: signed } = await admin.storage
      .from("inspection-videos")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    const publicUrl = signed?.signedUrl || urlData.publicUrl;

    const { data: videoRow, error: vErr } = await admin
      .from("inspection_videos")
      .insert({
        analysis_id,
        block_id: block_id || null,
        user_id: user.id,
        storage_path: path,
        public_url: publicUrl,
        video_type: videoTypeFromPurpose(media_purpose),
        mime_type: mime_type || "video/mp4",
        file_size_bytes: bytes.length,
        status: "uploaded",
      })
      .select()
      .single();

    if (vErr) throw vErr;

    // Append URL to block if block_id provided
    if (block_id) {
      const { data: block } = await admin
        .from("inspection_blocks")
        .select("file_urls")
        .eq("id", block_id)
        .maybeSingle();
      const urls = [...(block?.file_urls || []), publicUrl];
      await admin.from("inspection_blocks").update({ file_urls: urls }).eq("id", block_id);
    }

    return new Response(JSON.stringify({
      success: true,
      video: videoRow,
      url: publicUrl,
      storage_path: path,
    }), { headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    console.error("[inspection-upload-video]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
