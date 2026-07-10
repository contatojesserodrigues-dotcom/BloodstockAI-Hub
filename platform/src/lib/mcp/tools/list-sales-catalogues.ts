import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

declare const process: { env: Record<string, string | undefined> };

export default defineTool({
  name: "list_sales_catalogues",
  title: "List sales catalogues",
  description:
    "List thoroughbred auction catalogues indexed by BloodstockAI (Tattersalls, Goffs, Arqana, Keeneland, Fasig-Tipton, Inglis, Magic Millions, OBS, etc.).",
  inputSchema: {
    auction_house: z.string().optional().describe("Filter by auction house name (partial match)."),
    year: z.number().int().optional().describe("Filter by sale year."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ auction_house, year, limit }) => {
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let q = sb
      .from("catalogues" as any)
      .select("id,auction_house,sale_name,sale_year,sale_date,total_lots,status,source_url")
      .order("sale_date", { ascending: false })
      .limit(limit ?? 25);
    if (auction_house) q = q.ilike("auction_house", `%${auction_house}%`);
    if (year) q = q.eq("sale_year", year);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { catalogues: data ?? [] },
    };
  },
});