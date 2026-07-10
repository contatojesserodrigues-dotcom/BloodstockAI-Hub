import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

declare const process: { env: Record<string, string | undefined> };

function client() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "list_horses_for_sale",
  title: "List horses for sale",
  description:
    "List horses currently available on the BloodstockAI marketplace. Optional filters by sex, status (active/sold), country code, and free-text search over horse name, sire, dam, and consignor.",
  inputSchema: {
    status: z.enum(["active", "sold", "all"]).optional().describe("Listing status filter. Default 'active'."),
    sex: z.string().optional().describe("Filter by sex (e.g. Colt, Filly, Mare)."),
    country: z.string().optional().describe("Filter by country name or ISO code."),
    search: z.string().optional().describe("Free-text search across horse name, sire, dam, consignor."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, sex, country, search, limit }) => {
    const sb = client();
    let q = sb
      .from("marketplace_listings_public" as any)
      .select("id,horse_name,reference_code,sex,date_of_birth,sire,dam,dam_sire,consignor_name,country,guide_price,status,offers_close_at,category")
      .limit(limit ?? 20);
    if (status && status !== "all") q = q.eq("status", status);
    else q = q.in("status", ["active", "sold"]);
    if (sex) q = q.ilike("sex", sex);
    if (country) q = q.ilike("country", `%${country}%`);
    if (search) {
      const s = `%${search}%`;
      q = q.or(`horse_name.ilike.${s},sire.ilike.${s},dam.ilike.${s},consignor_name.ilike.${s},reference_code.ilike.${s}`);
    }
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { listings: data ?? [] },
    };
  },
});