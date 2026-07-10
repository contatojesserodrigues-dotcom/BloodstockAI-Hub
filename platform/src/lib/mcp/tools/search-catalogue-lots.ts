import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

declare const process: { env: Record<string, string | undefined> };

export default defineTool({
  name: "search_catalogue_lots",
  title: "Search catalogue lots",
  description:
    "Search auction catalogue lots by horse name, sire, or dam. Returns pedigree summary, lot number, sale info, and BloodstockAI scores when available.",
  inputSchema: {
    query: z.string().min(1).describe("Text to match against horse name, sire, or dam."),
    catalogue_id: z.string().uuid().optional().describe("Optional: restrict to a specific catalogue id."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, catalogue_id, limit }) => {
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const s = `%${query}%`;
    let q = sb
      .from("catalogue_lots" as any)
      .select("id,catalogue_id,lot_number,horse_name,sex,year_born,sire,dam,dam_sire,consignor,sold_price,currency,overall_score,potential_score,lot_status")
      .or(`horse_name.ilike.${s},sire.ilike.${s},dam.ilike.${s}`)
      .limit(limit ?? 25);
    if (catalogue_id) q = q.eq("catalogue_id", catalogue_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { lots: data ?? [] },
    };
  },
});