import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { callClaude, callClaudeWithDocument, QUALITY_CONTROLS } from "../_shared/ai-clients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const AIChatSchema = z.object({
      current_message: z.string().min(1).max(10000),
      messages: z.array(z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.union([z.string(), z.array(z.any())]),
      })).max(50),
      file_data: z.string().optional(),
      file_type: z.string().optional(),
      file_name: z.string().optional(),
    });

    const rawBody = await req.json();
    const parseResult = AIChatSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parseResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { messages, current_message, file_data, file_type, file_name } = parseResult.data;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const hasFile = !!file_data && !!file_type;

    console.log("AI Chat request (CLAUDE-ONLY):", { user_id: user.id, message_count: messages.length, hasFile });

    // Search internal database for context
    let databaseContext = "";
    const horseNameMatch = current_message.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);

    if (horseNameMatch && horseNameMatch.length > 0) {
      for (const horseName of horseNameMatch.slice(0, 3)) {
        const sanitizedName = horseName.replace(/%/g, '\\%').replace(/_/g, '\\_');
        const { data: horses } = await supabaseClient
          .from('horses')
          .select('*, races(*), sales(*)')
          .ilike('name', `%${sanitizedName}%`)
          .limit(1);

        if (horses && horses.length > 0) {
          const horse = horses[0];
          databaseContext += `\n\nInternal DB Record for ${horse.name}:
- Sire: ${horse.sire || 'Unknown'}, Dam: ${horse.dam || 'Unknown'}, Dam Sire: ${horse.dam_sire || 'Unknown'}
- YOB: ${horse.year_of_birth || 'Unknown'}, Sex: ${horse.sex || 'Unknown'}, Country: ${horse.country || 'Unknown'}
- Races: ${horse.races?.length || 0}, Sales: ${horse.sales?.length || 0}`;
        }
      }
    }

    let aiResponse = "";
    const aiSource = "claude";
    let taskType = "Analysis";

    // Build conversation history
    const conversationForClaude = messages
      .filter(m => m.role !== "system")
      .slice(-10)
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      }));

    const fullUserPrompt = conversationForClaude.length > 0
      ? `Previous conversation:\n${conversationForClaude.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nCurrent question: ${current_message}`
      : current_message;

    if (hasFile && file_data && file_type) {
      // ── CLAUDE: Document analysis ──
      taskType = "Document Analysis";

      const docSystemPrompt = `You are BloodstockAI, an elite thoroughbred bloodstock consultant.
You are reading and analyzing an actual document uploaded by the user.

When analysing a document ALWAYS provide:
## 🏆 TOP PURCHASE RECOMMENDATIONS (if catalog/sale document)
## 📋 DOCUMENT SUMMARY
## 🔍 PEDIGREE & BLOODLINE HIGHLIGHTS
## 💰 COMMERCIAL OBSERVATIONS
## ⚠️ AGENT NOTES

Be specific — reference actual lot numbers, horse names, sire names from the document.
Format your response using clear headers. Be direct, professional, and commercially minded.

${QUALITY_CONTROLS}
${databaseContext ? `\nINTERNAL DATABASE CONTEXT:${databaseContext}` : ''}`;

      aiResponse = await callClaudeWithDocument(
        ANTHROPIC_API_KEY,
        docSystemPrompt,
        `${current_message}\n\nFile: ${file_name || 'uploaded document'}`,
        file_data,
        file_type,
        { maxTokens: 6000 }
      );
    } else {
      // ── CLAUDE: All tasks (research + analysis) ──
      taskType = "AI Research & Analysis";

      const systemPrompt = `You are BloodstockAI, an elite thoroughbred bloodstock consultant powered by Claude AI as your SINGLE unified engine.

You perform BOTH research and analysis using your extensive training knowledge of thoroughbred racing, which includes data from:
- Racing Post, Equibase, JRA, Racing Australia (race records, ratings)
- PedigreeQuery, AllBreedPedigree, Thoroughbred Heritage (pedigrees)
- Keeneland, Tattersalls, Fasig-Tipton, Magic Millions, Arqana (auction results)
- Blood-Horse, TDN (stallion stats, industry news)
- Jockey Club Brasileiro, JRA datafile, Racing Australia (regional data)

CRITICAL RULES:
1. Use your training knowledge extensively — you know thousands of thoroughbred pedigrees, race records, and sales.
2. Cross-reference information from your knowledge before confirming.
3. If uncertain about a specific data point, state "Requires verification."
4. Conservative scoring — avoid inflated values.
5. Always respond in English.
6. For pedigrees, ALWAYS provide complete 5-generation data.

${QUALITY_CONTROLS}

ANALYSIS CAPABILITIES:
1. Pedigree Analysis — Nick ratings, dosage, chef-de-race, inbreeding coefficient
2. Performance Comparison — Race records, sibling analysis, aptitude assessment
3. Market Valuation — Based on comparable sales
4. Mating Recommendations — Genetic compatibility, commercial appeal
5. Investment Assessment — ROI projections with risk ratings
6. Stallion Research — Stud fees, progeny stats, standing locations
7. Rules & Regulations — Weatherbys, naming rules, eligibility

${databaseContext ? `\nINTERNAL DATABASE CONTEXT:${databaseContext}` : ''}`;

      aiResponse = await callClaude(ANTHROPIC_API_KEY, systemPrompt, fullUserPrompt, {
        maxTokens: 4000,
        temperature: 0.2,
      });
    }

    // Log activity
    await supabaseClient.from("activity_logs").insert({
      user_id: user.id,
      action: "ai_chat",
      resource_type: "chat",
      metadata: {
        message_length: current_message.length,
        response_length: aiResponse.length,
        has_file: hasFile,
        task_type: taskType,
        engine: "claude-only",
      },
    });

    return new Response(
      JSON.stringify({ response: aiResponse, source: aiSource, taskType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-chat function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        response: "I apologize, but I'm having trouble processing your request. Please try again.",
        source: "error",
        taskType: "Error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
