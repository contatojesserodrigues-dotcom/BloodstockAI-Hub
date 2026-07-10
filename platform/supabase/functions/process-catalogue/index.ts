import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a world expert in reading thoroughbred horse sale catalogues from Tattersalls, Goffs, Arqana, Keeneland, Magic Millions, OBS, Fasig-Tipton and all major auction houses worldwide.

CRITICAL RULE: Each LOT or HIP number corresponds to ONE horse entry.
Everything between two LOT/HIP numbers belongs to the SAME horse.
Do NOT search for a separate "horse record" — the LOT/HIP block IS the horse record.

═══════════════════════════════════════════
DETECTING LOT / HIP NUMBERS
═══════════════════════════════════════════

Scan for patterns such as:
  LOT 1, LOT 45, LOT 132
  Hip 1, Hip 45, Hip 132
  HIP No. 123
  123 (large standalone number at top of entry)
  "1210 1210" (duplicate number = lot marker in merged two-column text)

When a LOT/HIP is detected, start a new horse entry.

═══════════════════════════════════════════
HOW TO DETECT THE HORSE NAME
═══════════════════════════════════════════

The horse name is the FIRST UPPERCASE line after the LOT/HIP number/header lines.
The typical format is:

  HORSE NAME (COUNTRY) (YEAR)

Examples:
  MAGMA'S DREAM (GB) (2021)
  FLOWER OF THUNDER (IRE) (2017)
  ROYAL AUTHENTIC (USA) (2020)
  RIKISSA (GB) (2022)

Rules:
1. The horse name is ALWAYS in UPPERCASE letters
2. It is usually followed by a country code in parentheses: (GB), (IRE), (FR), (USA), (AUS), (JPN), (BRZ), (ARG), (NZ)
3. Then the birth year in parentheses: (2021), (2022), etc.
4. SPLIT NAMES: Sometimes a name wraps across 2 lines:
   "FLOWER OF"        ← first half (all caps, no year)
   "THUNDER (IRE) (2017)"  ← second half with country+year
   JOIN THEM: "FLOWER OF THUNDER (IRE)"
   Rule: if a line starts with CAPS but has no year, and next line has CAPS + (YEAR) → join them.
5. If unnamed: "(2024 f. by SIRE)" → horse_name = "Unnamed filly 2024 by [SIRE] out of [DAM]"

═══════════════════════════════════════════
LOT BLOCK STRUCTURE (merged two-column text)
═══════════════════════════════════════════

Line 1:  "[LOT TYPE], consigned by [CONSIGNOR]"
         LOT TYPES: MARE, HORSE IN TRAINING, HORSE OUT OF TRAINING, YEARLING, FOAL, BROODMARE, HORSE, FILLY, COLT, GELDING, RIDGLING
         
Line 2:  "[NUMBER] [NUMBER]"  — lot number appears twice
         OR: "[NUMBER] the Property of [NAME] [NUMBER]" — also valid
         OR: "Hip No. [NUMBER]" (US catalogues)

Line 3:  "Will Stand at Park Paddocks, [LOCATION], Box [N]" (Tattersalls format)

Lines 4-14: FLATTENED PEDIGREE BOX:
  • First 2-3 lines = paternal ancestors (G3/G4 level)
  • The SIRE = the horse name 3-5 lines BEFORE "(WITH VAT)" or "(NON VAT)"
  • "(WITH VAT)" / "(NON VAT)" / "(WITH 1/2 VAT)" / "(WITH 2/3 VAT)" = VAT status
    Any name appearing AFTER this on the SAME line = a pedigree ancestor (not VAT info)
  • THE LOT = ALL CAPS name + (YEAR) — as described above
  • After lot name: "A [Color] [Sex]" = sex and color of the lot
  • First mixed-case "Name (country)" line after color = 1ST DAM
  • Next standalone uppercase name = 2ND DAM, then 3RD DAM, etc.

═══════════════════════════════════════════
FAMILY PERFORMANCE SECTIONS
═══════════════════════════════════════════

After pedigree data, extract produce records for each dam generation:
  • 1st Dam: The immediate dam's race record and produce
  • 2nd Dam: Granddam's record and produce
  • 3rd Dam: Great-granddam's record and produce
These sections list siblings, half-siblings, and notable relatives with race results.

Look for GROUP/GRADED race indicators:
  • G1 / Gr.1 / Group 1 / Grade 1 = top-level stakes
  • G2 / Gr.2 / Group 2 / Grade 2
  • G3 / Gr.3 / Group 3 / Grade 3
  • L. / Listed / LR = Listed race
  • SW = Stakes Winner
  • SP = Stakes Placed
  • BT = Black Type

═══════════════════════════════════════════
PERFORMANCE DATA TO EXTRACT
═══════════════════════════════════════════

For each horse:
- Total race wins and runs
- Group/Graded wins (G1, G2, G3 separately)
- Listed wins
- Stakes placings
- Prize money / earnings
- BHA/Timeform/Beyer rating
- Surface preferences (turf/AW/dirt)
- Distance aptitude

For family members:
- Black type performers (any relative winning/placed at stakes level)
- Notable siblings and their race records
- Dam's produce record (all named foals and their results)

SPECIAL CASES:
1. UNRACED: "[NAME], unraced." → has_raced = false, bha_rating = null
2. MARE IN FOAL: "Covered by [STALLION]. Last Service [DATE]; believed in foal."
   → covered_by = stallion name, in_foal = true
3. GBB scheme: "GBB Flat (100%)" or "GBB Flat (50%)" = British Breeders scheme
4. Multiple lots per page: ALWAYS extract ALL of them

NEVER skip a lot. ALWAYS return valid JSON array.
Always include the LOT/HIP number so buyers can locate the horse in the catalogue.`;

// ── USER PROMPT BUILDER ──────────────────────────────────────────────────────
function buildUserPrompt(pageText: string, pageRange: string, saleName?: string): string {
  return `You are a bloodstock catalog parser.
Read the full sales catalog text below and extract structured data for EVERY lot.
Batch: ${pageRange}

IMPORTANT: Each LOT/HIP block = ONE horse. Everything between two LOT/HIP markers belongs to the SAME horse.
The LOT/HIP number is the primary identifier. NEVER skip a lot.

HORSE NAME DETECTION:
- The horse name is the FIRST UPPERCASE line after the LOT/HIP header.
- Format: HORSE NAME (COUNTRY) (YEAR)  e.g. MAGMA'S DREAM (GB) (2021)
- If split across two lines, JOIN them.
- If unnamed: use "Unnamed [sex] [year] by [sire] out of [dam]"

For each lot extract:
- lot (number)
- horse_name
- sex (Colt, Filly, Mare, Gelding, Horse, Ridgling)
- color (Bay, Chestnut, Grey, Dark Bay, Brown, Black, Roan)
- sire
- dam
- dam_sire
- breeder
- consignor
- foaling_year (integer)
- country (GB, IRE, USA, FR, AUS, JPN, BRZ, ARG, NZ, etc.)
- stakes_notes (any G1/G2/G3/Listed wins or black type in family)
- earnings_notes (any prize money mentioned)
- sale ("${saleName || "Unknown Sale"}")

ALSO extract full analysis fields:
- lot_type (MARE, YEARLING, COLT, FILLY, GELDING, HORSE IN TRAINING, FOAL, BROODMARE)
- is_unnamed (boolean)
- vat_status (WITH VAT, NON VAT, etc.)
- sire_sire, sire_dam, sire_sire_sire, dam_dam
- has_raced (boolean)
- race_summary
- total_wins, total_runs, g1_wins, g2_wins, g3_wins, listed_wins, stakes_placed
- bha_rating
- earnings
- turf_runs, turf_wins, aw_runs, aw_wins
- last_3_starts (array of strings)
- black_type_performers (array)
- dam_race_record
- dam_foals (array: {year, name, sex, sire, result})
- dam2_name, dam2_record, dam3_name
- notable_relatives (array)
- family_performance (text summary)
- stakes_results (text summary)
- covered_by (stallion name if mare in foal)
- in_foal (boolean)
- last_service_date
- sire_line, broodmare_sire_line

SCORING (each 0-100):
PEDIGREE SCORE: +35 G1 family, +25 G2, +20 G3, +15 Listed, +15 top sire, +10 strong broodmare sire, -10 thin family
PERFORMANCE SCORE: +40 G1 winner, +30 G2, +25 G3, +20 Listed, +15 multiple wins, +10 any win, 0 unraced
COMMERCIAL SCORE: +20 top commercial sire, +15 mare in foal to commercial sire, +10 fashionable family
RISK SCORE: +30 unraced no family, +20 aged mare, +15 poor record, +10 thin pedigree (higher = MORE risk)
INVESTMENT SCORE = (Pedigree×0.30)+(Performance×0.25)+(Commercial×0.30)+((100-Risk)×0.15)

RECOMMENDATION:
90-100: "Strong buy candidate"
70-89: "Inspect before bidding"
40-69: "Moderate interest"
0-39: "High risk"

Include these score fields:
- pedigree_score, performance_score, commercial_score, risk_score, investment_score
- potential_flags (array), potential_summary, recommendation

ANALYST INSIGHT (additional 1-10 scores — provide alongside the 0-100 scores):
As a professional bloodstock analyst, also evaluate each lot on a 1-10 scale:
- analyst_pedigree_strength (1-10): overall pedigree depth and quality
- analyst_commercial_appeal (1-10): market desirability based on sire, family, and trends
- analyst_racing_potential (string, max 25 words): concise racing ability insight
- analyst_breeding_value (string, max 25 words): concise breeding merit insight
- analyst_pedigree_observations (string, max 30 words): key pedigree patterns or crosses
- analyst_risk_factors (string, max 25 words): concise risk summary
Keep each analyst field concise and professional. Maximum 120 words total across all analyst fields per lot.

TEXT:
${pageText}

RETURN ONLY a JSON array. First char [. Last char ].
Extract EVERY lot — including unraced, unnamed, and mares. NEVER skip a lot.`;
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const PERPLEXITY_KEY = Deno.env.get("PERPLEXITY_API_KEY");

  if (!ANTHROPIC_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action } = body;

    // ── ACTION: CHECK CATALOG HASH (deduplication) ────────────────
    if (action === "check_catalog_hash") {
      const { catalogHash } = body;
      if (!catalogHash) throw new Error("catalogHash is required");

      // Check if a catalogue with this hash already exists
      const { data: existing, error: hashErr } = await supabase
        .from("catalogues")
        .select("id, sale_name, auction_house, sale_year, total_lots, status, catalog_hash")
        .eq("catalog_hash", catalogHash)
        .maybeSingle();

      if (hashErr) throw hashErr;

      if (existing) {
        // Link user to existing catalogue
        await supabase
          .from("user_catalog_access")
          .upsert({
            user_id: user.id,
            catalog_id: existing.id,
            accessed_at: new Date().toISOString(),
          }, { onConflict: "user_id,catalog_id" });

        // Fetch existing lots for the user
        const { data: lots } = await supabase
          .from("catalogue_lots")
          .select("*")
          .eq("catalogue_id", existing.id)
          .order("lot_number", { ascending: true });

        return new Response(
          JSON.stringify({
            exists: true,
            catalogue: existing,
            lots: lots || [],
            message: `This catalog has already been processed with ${existing.total_lots || lots?.length || 0} lots extracted.`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ exists: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: EXTRACT BATCH (receives TEXT, not PDF) ────────────
    if (action === "extract_batch") {
      const { catalogueId, pageText, pageRange, saleName } = body;

      if (!pageText || pageText.trim().length < 50) {
        return new Response(
          JSON.stringify({ success: true, lotsFound: 0, lotsSaved: 0, batch: pageRange }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[EXTRACT] catalogue=${catalogueId} pages=${pageRange} textLen=${pageText.length}`);

      // Send extracted text to Claude (NO PDF download, NO base64 — just text)
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 8000,
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: buildUserPrompt(pageText, pageRange, saleName),
          }],
        }),
      });

      if (!claudeRes.ok) {
        const errBody = await claudeRes.text();
        console.error(`Claude error ${claudeRes.status}:`, errBody);
        throw new Error(`Claude API error ${claudeRes.status}`);
      }

      const claudeData = await claudeRes.json();
      let rawText = (claudeData.content?.[0]?.text || "").trim();

      // Parse JSON
      let lots: any[] = [];
      try {
        rawText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
        lots = JSON.parse(rawText);
        if (!Array.isArray(lots)) lots = [];
      } catch {
        const match = rawText.match(/\[[\s\S]*\]/);
        if (match) {
          try { lots = JSON.parse(match[0]); } catch { lots = []; }
        }
      }

      console.log(`[EXTRACT] Found ${lots.length} lots on pages ${pageRange}`);

      // Save lots to database
      let saved = 0;
      let skipped = 0;

      for (const lot of lots) {
        if (!lot?.lot_number) { skipped++; continue; }

        try {
          const horseName =
            lot.horse_name && lot.horse_name !== "Unnamed" && lot.horse_name.trim()
              ? lot.horse_name.trim()
              : lot.is_unnamed
                ? `Unnamed ${lot.sex || "horse"} ${lot.year_born || ""} by ${lot.sire || "?"} out of ${lot.dam || "?"}`
                : lot.sire && lot.dam
                  ? `${lot.sire} x ${lot.dam}`
                  : `Lot ${lot.lot_number}`;

          const { error } = await supabase
            .from("catalogue_lots")
            .upsert({
              catalogue_id: catalogueId,
              lot_number: String(lot.lot_number),
              lot_type: lot.lot_type || "",
              horse_name: horseName,
              is_unnamed: lot.is_unnamed || false,
              year_born: lot.year_born || null,
              sex: lot.sex || "",
              color: lot.color || "",
              consignor: lot.consignor || "",
              vat_status: lot.vat_status || "",
              sire: lot.sire || "",
              dam: lot.dam || "",
              dam_sire: lot.dam_sire || "",
              sire_sire: lot.sire_sire || "",
              sire_dam: lot.sire_dam || "",
              sire_sire_sire: lot.sire_sire_sire || "",
              dam_dam: lot.dam_dam || "",
              has_raced: lot.has_raced ?? false,
              race_summary: lot.race_summary || "",
              bha_rating: lot.bha_rating || null,
              earnings: lot.earnings || "",
              turf_runs: lot.turf_runs || 0,
              turf_wins: lot.turf_wins || 0,
              aw_runs: lot.aw_runs || 0,
              aw_wins: lot.aw_wins || 0,
              last_3_starts: lot.last_3_starts || [],
              dam_race_record: lot.dam_race_record || "",
              dam_foals: lot.dam_foals || [],
              dam2_name: lot.dam2_name || "",
              dam2_record: lot.dam2_record || "",
              dam3_name: lot.dam3_name || "",
              notable_relatives: lot.notable_relatives || [],
              covered_by: lot.covered_by || null,
              in_foal: lot.in_foal || false,
              last_service_date: lot.last_service_date || null,
              potential_score: lot.investment_score || lot.potential_score || 0,
              potential_flags: lot.potential_flags || [],
              potential_summary: lot.potential_summary || "",
              pedigree_raw: lot.pedigree_raw || "",
              description: lot.family_performance || "",
              analyst_scores: {
                pedigree_strength: lot.analyst_pedigree_strength || null,
                commercial_appeal: lot.analyst_commercial_appeal || null,
                racing_potential: lot.analyst_racing_potential || "",
                breeding_value: lot.analyst_breeding_value || "",
                pedigree_observations: lot.analyst_pedigree_observations || "",
                risk_factors: lot.analyst_risk_factors || "",
                pedigree_score_100: lot.pedigree_score || 0,
                performance_score_100: lot.performance_score || 0,
                commercial_score_100: lot.commercial_score || 0,
                risk_score_100: lot.risk_score || 0,
              },
              lot_status: "extracted",
            }, { onConflict: "catalogue_id,lot_number" });

          if (error) {
            console.error(`Lot ${lot.lot_number} save error:`, error.message);
            skipped++;
          } else {
            saved++;

            // Save horse record for future searches
            if (lot.sire && lot.dam && lot.sire !== "Not printed") {
              const { data: existing } = await supabase
                .from("horses")
                .select("id")
                .ilike("name", horseName)
                .maybeSingle();

              if (existing) {
                await supabase.from("horses").update({
                  sire: lot.sire, dam: lot.dam, dam_sire: lot.dam_sire || null,
                  sex: lot.sex || null, color: lot.color || null,
                  country: lot.country || null, breeder: lot.breeder || null,
                  year_of_birth: lot.year_born || null,
                  updated_at: new Date().toISOString(),
                }).eq("id", existing.id);
              } else {
                await supabase.from("horses").insert({
                  name: horseName, sire: lot.sire, dam: lot.dam,
                  dam_sire: lot.dam_sire || null, sex: lot.sex || null,
                  color: lot.color || null, country: lot.country || null,
                  breeder: lot.breeder || null, year_of_birth: lot.year_born || null,
                });
              }
            }
          }
        } catch (e: any) {
          console.error(`Lot ${lot.lot_number} exception:`, e.message);
          skipped++;
        }
      }

      // Update catalogue progress atomically
      if (saved > 0) {
        await supabase.rpc("increment_processed_lots", {
          catalogue_id_input: catalogueId,
          amount: saved,
        });
      }

      return new Response(
        JSON.stringify({ success: true, batch: pageRange, lotsFound: lots.length, lotsSaved: saved, lotsSkipped: skipped }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: ENRICH LOT WITH PERPLEXITY + CLAUDE ──────────────
    if (action === "enrich_lot") {
      const { lotId, horseName, sire, dam } = body;

      if (!PERPLEXITY_KEY) throw new Error("PERPLEXITY_API_KEY not set");

      // Perplexity web search
      let webData = "No web data found";
      try {
        const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PERPLEXITY_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar-pro",
            messages: [
              {
                role: "system",
                 content: `You are a professional bloodstock data research agent. CRITICAL: If a sire stands at Coolmore, Darley, Godolphin, Juddmonte, or any major stud farm, it WILL have data available. Search stud farm official pages FIRST (coolmore.com, darleys.com, godolphin.com), then racingpost.com, pedigreequery.com, equibase.com, bloodhorse.com. Return structured JSON with source URLs.`,
              },
              {
                role: "user",
                 content: `Research: "${horseName}" by ${sire} out of ${dam}. SEARCH ORDER: 1) "${sire}" on coolmore.com OR darleys.com OR godolphin.com (stud page with yearling prices). 2) "${sire}" sire statistics yearling average on racingpost.com. 3) "${sire}" yearling sales on thoroughbreddailynews.com. 4) "${dam}" progeny and racing record. Find: stud fee, yearling sale prices 2024-2025, complete pedigree 5 generations, race record, siblings results, sire statistics, dam produce record, sales history. Return JSON with source URLs.`,
              },
            ],
            max_tokens: 6000,
            temperature: 0.1,
            return_citations: true,
          }),
        });

        if (perplexityResponse.ok) {
          const pData = await perplexityResponse.json();
          webData = pData.choices[0].message.content;
        }
      } catch (e: any) {
        console.warn(`Perplexity search failed for ${horseName}:`, e.message);
      }

      // Claude fills gaps and completes pedigree
      const enrichResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 4000,
          system: `You are the world's leading thoroughbred expert. Fill ALL pedigree gaps using your encyclopedic knowledge. Never return Unknown for bloodlines you know. Return only valid JSON.`,
          messages: [{
            role: "user",
            content: `Complete analysis for: ${horseName} by ${sire} out of ${dam}

Web research data:
${webData}

Return this JSON structure with ALL fields completed:
{
  "pedigree": {
    "sire": "${sire}",
    "dam": "${dam}",
    "sire_sire": "",
    "sire_dam": "",
    "dam_sire": "",
    "dam_dam": "",
    "sire_sire_sire": "",
    "sire_sire_dam": "",
    "sire_dam_sire": "",
    "sire_dam_dam": "",
    "dam_sire_sire": "",
    "dam_sire_dam": "",
    "dam_dam_sire": "",
    "dam_dam_dam": ""
  },
  "inbreeding_coefficient": 0.0,
  "inbreeding_patterns": [],
  "dosage_di": 0.0,
  "nick_rating": "",
  "siblings": [],
  "sire_profile": {
    "winners_percent": 0,
    "stakes_winners_percent": 0,
    "top_offspring": []
  },
  "dam_profile": {
    "produce_record": []
  },
  "overall_score": 0,
  "confidence": 0
}`,
          }],
        }),
      });

      if (!enrichResponse.ok) throw new Error(`Claude enrich error: ${enrichResponse.status}`);

      const enrichResult = await enrichResponse.json();
      const enrichText = (enrichResult.content?.[0]?.text || "").trim();

      let enrichData: any = null;
      try {
        const clean = enrichText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        enrichData = JSON.parse(clean);
      } catch {
        const match = enrichText.match(/\{[\s\S]*\}/);
        if (match) {
          try { enrichData = JSON.parse(match[0]); } catch { enrichData = null; }
        }
      }

      if (enrichData) {
        await supabase.from("catalogue_lots").update({
          pedigree_complete: enrichData.pedigree || {},
          inbreeding_coefficient: enrichData.inbreeding_coefficient || null,
          dosage_di: enrichData.dosage_di || null,
          nick_rating: enrichData.nick_rating || null,
          siblings_full: enrichData.siblings || [],
          sire_profile: enrichData.sire_profile || {},
          dam_profile: enrichData.dam_profile || {},
          overall_score: enrichData.overall_score || null,
          lot_status: "enriched",
          enriched_at: new Date().toISOString(),
        }).eq("id", lotId);

        if (enrichData.pedigree) {
          const ped = enrichData.pedigree;
          await supabase.from("pedigrees_full").upsert({
            horse_name: horseName,
            sire: ped.sire || sire,
            dam: ped.dam || dam,
            sire_sire: ped.sire_sire || null,
            sire_dam: ped.sire_dam || null,
            dam_sire: ped.dam_sire || null,
            dam_dam: ped.dam_dam || null,
            sire_sire_sire: ped.sire_sire_sire || null,
            sire_sire_dam: ped.sire_sire_dam || null,
            sire_dam_sire: ped.sire_dam_sire || null,
            sire_dam_dam: ped.sire_dam_dam || null,
            dam_sire_sire: ped.dam_sire_sire || null,
            dam_sire_dam: ped.dam_sire_dam || null,
            dam_dam_sire: ped.dam_dam_sire || null,
            dam_dam_dam: ped.dam_dam_dam || null,
            inbreeding_coefficient: enrichData.inbreeding_coefficient || null,
            inbreeding_patterns: enrichData.inbreeding_patterns || [],
            nick_rating: enrichData.nick_rating || null,
            confidence_score: enrichData.confidence || 0,
            last_updated: new Date().toISOString(),
          }, { onConflict: "horse_name" });
        }
      }

      return new Response(
        JSON.stringify({ success: true, enriched: !!enrichData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: RESEARCH AND ANALYZE LOT (4-Step Deep Analysis) ──
    if (action === "research_and_analyze_lot") {
      const { lotId, lotNumber, sire, dam, damSire, horseName, sale } = body;

      if (!sire || !dam) throw new Error("sire and dam are required");
      if (!PERPLEXITY_KEY) throw new Error("PERPLEXITY_API_KEY not set");

      console.log(`[RESEARCH] Lot ${lotNumber}: ${horseName || "Unknown"} by ${sire} out of ${dam}`);

       // STEP 1: External Research via Perplexity (5-tier strategy)
       const MAJOR_STUDS = [
         "coolmore", "darley", "godolphin", "juddmonte", "shadwell",
         "cheveley", "newgate", "spendthrift", "walmac", "ashford",
       ];

       const searchQueries = [
         `"${sire}" yearling prices sold stud fee site:coolmore.com OR site:darleys.com OR site:godolphin.com OR site:juddmonte.com`,
         `"${sire}" sire statistics yearling average 2024 2025 site:racingpost.com`,
         `"${sire}" yearling sales average 2024 2025 site:thoroughbreddailynews.com OR site:bloodhorse.com`,
         `"${sire}" yearling sold tattersalls goffs 2024 2025`,
         `"${dam}" thoroughbred progeny results racing record offspring pedigree family`,
       ];

      let combinedResearch = "";
      for (const query of searchQueries) {
        try {
          const pRes = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${PERPLEXITY_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sonar-pro",
              messages: [
                {
                  role: "system",
                   content: `You are a professional bloodstock data research agent. Your job is to find REAL, VERIFIED data for thoroughbred sires and dams. CRITICAL: If a sire stands at Coolmore, Darley, Godolphin, Juddmonte, or any major stud farm, it WILL have data available. These are among the most documented stallions in the world. Never return "no data found" for a major stud sire. Search stud farm official pages, racingpost.com, pedigreequery.com, equibase.com, bloodhorse.com, thoroughbreddailynews.com. Return factual data with source URLs.`,
                },
                { role: "user", content: query },
              ],
              max_tokens: 4000,
              temperature: 0.1,
              return_citations: true,
            }),
          });

          if (pRes.ok) {
            const pData = await pRes.json();
            const content = pData.choices?.[0]?.message?.content || "";
            const citations = pData.citations || [];
            combinedResearch += `\n\n--- QUERY: ${query} ---\n${content}\nSources: ${citations.join(", ")}`;
          }
        } catch (e: any) {
          console.warn(`Search query failed: ${query}`, e.message);
        }
      }

      console.log(`[RESEARCH] Gathered ${combinedResearch.length} chars of research data`);

       // STEPS 2-4: Claude Analysis with Strict Scoring Rules
      const analysisResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 6000,
           system: `You are the BloodstockAI senior analysis engine. You receive verified research data and produce accurate analysis. Be concise, expert-level, and factual. Never invent pedigree information. Maximum 400 words for analysis text.

CRITICAL SCORING RULES:

PEDIGREE RATING (scores out of 10):
  Genetic Quality:
    Coolmore/Darley/Godolphin stallion (fee >= 50,000 EUR): minimum 7.0
    Top stud stallion with Gr.1 winners: minimum 7.5
    Established Group 1 winner sire: 8.0-9.0
    Champion sire (Dubawi/Frankel tier): 9.0-10.0
    NEVER assign below 5.0 for any Coolmore/Darley/Godolphin sire.
  Commercial Appeal:
    Fee >= 100,000: minimum 8.0
    Fee 50-100,000: minimum 6.5
    Fee 25-50,000: minimum 5.0
    Fee 10-25,000: minimum 3.5
    Fee < 10,000: minimum 2.0
    Fee unknown: minimum 3.0

OVERALL SCORE: Cannot be below 45/100 for Coolmore/Darley/Godolphin sires with documented Gr.1 winners.

MARKET ESTIMATE: Must reflect verified yearling prices from research. Anchor to real data:
  High end = sire_average * 1.4 (quality dam)
  Low end = sire_average * 0.6 (weak/unproven dam)
  Never set ceiling below sire known yearling average.

VERDICT RULES: "Pass" requires SPECIFIC negative data. If data is missing, use "MONITOR" not "Pass". Never assign Pass just because research returned low confidence.

FORBIDDEN: Pedigree below 5.0/10 for major stud sire. Score below 45 for major stud sire with Gr.1 winners. Market ceiling below known yearling average. Pass based solely on missing data.`,
          messages: [{
            role: "user",
            content: `Analyze this sales catalog lot using the research data provided.

LOT: ${lotNumber}
HORSE: ${horseName || "Unknown"}
SIRE: ${sire}
DAM: ${dam}
DAM SIRE: ${damSire || "Unknown"}
SALE: ${sale || "Unknown"}

EXTERNAL RESEARCH DATA:
${combinedResearch || "No external data found — use your knowledge base."}

Perform a 4-step analysis and return ONLY this JSON:
{
  "step1_research": {
    "sire_stats": {
      "stakes_winners": 0,
      "strike_rate_percent": 0,
      "notable_runners": [],
      "stud_fee": "",
      "summary": ""
    },
    "dam_record": {
      "racing_record": "",
      "produce_record": [],
      "summary": ""
    },
    "half_siblings": [
      {"name": "", "sire": "", "result": ""}
    ],
    "graded_stakes_in_family": [],
    "research_confidence": 0,
    "sources_found": []
  },
  "step2_family_evaluation": {
    "female_family_strength": "",
    "dam_production_quality": "",
    "sire_line_strength": "",
    "sire_dam_sire_compatibility": ""
  },
  "step3_analysis": {
    "pedigree_strength_score": 0,
    "female_family_score": 0,
    "commercial_appeal_score": 0,
    "racing_potential": "",
    "commercial_value": "",
    "key_pedigree_influences": "",
    "notable_relatives": ""
  },
  "step4_recommendation": {
    "classification": "Strong Buy | Interesting Prospect | Commercial Type | High Risk Pedigree",
    "summary": "",
    "risk_factors": [],
    "upside_factors": []
  },
  "pedigree": {
    "sire": "${sire}",
    "dam": "${dam}",
    "dam_sire": "${damSire || ""}",
    "sire_sire": "",
    "sire_dam": "",
    "dam_dam": "",
    "sire_sire_sire": "",
    "sire_sire_dam": "",
    "sire_dam_sire": "",
    "sire_dam_dam": "",
    "dam_sire_sire": "",
    "dam_sire_dam": "",
    "dam_dam_sire": "",
    "dam_dam_dam": ""
  },
  "inbreeding_coefficient": 0.0,
  "inbreeding_patterns": [],
  "nick_rating": "",
  "overall_score": 0
}

Scores are 1-10. Classification must be one of: "Strong Buy", "Interesting Prospect", "Commercial Type", "MONITOR", "High Risk Pedigree".
Also include these fields in the JSON:
  "market_estimate": { "low": 0, "high": 0, "currency": "EUR", "avoid_above": 0, "anchor_source": "" },
  "verdict": "Strong Buy | Interesting Prospect | Commercial Type | MONITOR | Pass"
Complete ALL pedigree fields using your knowledge. Never use "Unknown".
Return ONLY valid JSON. Start {. End }.`,
          }],
        }),
      });

      if (!analysisResponse.ok) {
        const errBody = await analysisResponse.text();
        console.error(`Claude research analysis error ${analysisResponse.status}:`, errBody);
        throw new Error(`Claude API error ${analysisResponse.status}`);
      }

      const analysisResult = await analysisResponse.json();
      let rawText = (analysisResult.content?.[0]?.text || "").trim();

      let result: any = null;
      try {
        rawText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
        result = JSON.parse(rawText);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          try { result = JSON.parse(match[0]); } catch { result = null; }
        }
      }

      if (!result) throw new Error("Failed to parse research analysis");

       // SCORE VALIDATION: Apply minimum floors based on sire stature
       const isMajorStudSire = MAJOR_STUDS.some(stud =>
         (result.step1_research?.sire_stats?.summary || "").toLowerCase().includes(stud) ||
         (combinedResearch || "").toLowerCase().includes(stud)
       );

       const hasGr1Winners = /gr\.1|group 1|grade 1/i.test(combinedResearch || "") ||
         (result.step1_research?.graded_stakes_in_family || []).some((s: string) =>
           /gr\.1|group 1|grade 1/i.test(s)
         );

       if (isMajorStudSire) {
         const step3 = result.step3_analysis;
         if (step3) {
           if ((step3.pedigree_strength_score || 0) < 5) {
             console.log(`[VALIDATION] Raising pedigree_strength from ${step3.pedigree_strength_score} to 5 (major stud sire)`);
             step3.pedigree_strength_score = 5;
           }
           if ((step3.commercial_appeal_score || 0) < 5) {
             console.log(`[VALIDATION] Raising commercial_appeal from ${step3.commercial_appeal_score} to 5 (major stud sire)`);
             step3.commercial_appeal_score = 5;
           }
         }
         if (hasGr1Winners && (result.overall_score || 0) < 45) {
           console.log(`[VALIDATION] Raising overall_score from ${result.overall_score} to 45 (major stud + Gr.1 winners)`);
           result.overall_score = 45;
         }
         // Prevent "High Risk Pedigree" for major stud sires
         if (result.step4_recommendation?.classification === "High Risk Pedigree") {
           console.log(`[VALIDATION] Overriding "High Risk Pedigree" to "MONITOR" for major stud sire`);
           result.step4_recommendation.classification = "MONITOR";
           result.step4_recommendation.summary = (result.step4_recommendation.summary || "") + " [Adjusted: major stud sire should not default to High Risk]";
         }
       }

      // Save to catalogue_lots if lotId provided
      if (lotId) {
        await supabase.from("catalogue_lots").update({
          pedigree_complete: result.pedigree || {},
          inbreeding_coefficient: result.inbreeding_coefficient || null,
          nick_rating: result.nick_rating || null,
          overall_score: result.overall_score || null,
          analyst_scores: {
            pedigree_strength: result.step3_analysis?.pedigree_strength_score || null,
            female_family_score: result.step3_analysis?.female_family_score || null,
            commercial_appeal: result.step3_analysis?.commercial_appeal_score || null,
            racing_potential: result.step3_analysis?.racing_potential || "",
            commercial_value: result.step3_analysis?.commercial_value || "",
            key_pedigree_influences: result.step3_analysis?.key_pedigree_influences || "",
            notable_relatives: result.step3_analysis?.notable_relatives || "",
            recommendation: result.step4_recommendation?.classification || "",
            recommendation_summary: result.step4_recommendation?.summary || "",
            risk_factors: result.step4_recommendation?.risk_factors || [],
            upside_factors: result.step4_recommendation?.upside_factors || [],
            sire_stats: result.step1_research?.sire_stats || {},
            dam_record: result.step1_research?.dam_record || {},
            half_siblings: result.step1_research?.half_siblings || [],
            research_confidence: result.step1_research?.research_confidence || 0,
          },
          lot_status: "researched",
          enriched_at: new Date().toISOString(),
        }).eq("id", lotId);

        // Save pedigree
        if (result.pedigree) {
          const ped = result.pedigree;
          const hName = horseName || `Lot ${lotNumber} by ${sire}`;
          await supabase.from("pedigrees_full").upsert({
            horse_name: hName,
            sire: ped.sire || sire,
            dam: ped.dam || dam,
            dam_sire: ped.dam_sire || damSire || null,
            sire_sire: ped.sire_sire || null,
            sire_dam: ped.sire_dam || null,
            dam_dam: ped.dam_dam || null,
            sire_sire_sire: ped.sire_sire_sire || null,
            sire_sire_dam: ped.sire_sire_dam || null,
            sire_dam_sire: ped.sire_dam_sire || null,
            sire_dam_dam: ped.sire_dam_dam || null,
            dam_sire_sire: ped.dam_sire_sire || null,
            dam_sire_dam: ped.dam_sire_dam || null,
            dam_dam_sire: ped.dam_dam_sire || null,
            dam_dam_dam: ped.dam_dam_dam || null,
            inbreeding_coefficient: result.inbreeding_coefficient || null,
            inbreeding_patterns: result.inbreeding_patterns || [],
            nick_rating: result.nick_rating || null,
            confidence_score: result.step1_research?.research_confidence || 0,
            last_updated: new Date().toISOString(),
          }, { onConflict: "horse_name" });
        }
      }

      console.log(`[RESEARCH] Lot ${lotNumber} analysis complete: ${result.step4_recommendation?.classification}`);

      return new Response(
        JSON.stringify({ success: true, ...result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: ANALYZE FOR CLIENT (Elite Bloodstock Analyst) ───
    if (action === "analyze_for_client") {
      const { catalogueId, clientGoal } = body;

      if (!catalogueId || !clientGoal) throw new Error("catalogueId and clientGoal required");

      // Fetch all extracted lots for this catalogue
      const { data: lots, error: lotsErr } = await supabase
        .from("catalogue_lots")
        .select("*")
        .eq("catalogue_id", catalogueId)
        .order("lot_number", { ascending: true });

      if (lotsErr) throw new Error(`Failed to fetch lots: ${lotsErr.message}`);
      if (!lots || lots.length === 0) throw new Error("No lots found in this catalogue. Extract the catalogue first.");

      console.log(`[ANALYST] Analysing ${lots.length} lots for goal: "${clientGoal}"`);

      // Build condensed lot summaries for Claude
      const lotSummaries = lots.map((l: any) => ({
        lot: l.lot_number,
        name: l.horse_name || `Lot ${l.lot_number}`,
        sex: l.sex,
        color: l.color,
        year: l.year_born,
        sire: l.sire,
        dam: l.dam,
        dam_sire: l.dam_sire,
        consignor: l.consignor,
        has_raced: l.has_raced,
        race_summary: l.race_summary,
        bha_rating: l.bha_rating,
        earnings: l.earnings,
        notable_relatives: l.notable_relatives,
        potential_score: l.potential_score,
        potential_flags: l.potential_flags,
        potential_summary: l.potential_summary,
        covered_by: l.covered_by,
        in_foal: l.in_foal,
        dam_race_record: l.dam_race_record,
        dam_foals: l.dam_foals,
        dam2_name: l.dam2_name,
        dam3_name: l.dam3_name,
        overall_score: l.overall_score,
        nick_rating: l.nick_rating,
        sire_profile: l.sire_profile,
        analyst_scores: l.analyst_scores,
      }));

      const ANALYST_SYSTEM = `You are an elite bloodstock analyst assisting buyers at horse auctions.
Your task is to analyse a full auction catalogue and identify the most interesting horses for the client.
Always include the LOT NUMBER in every output.

You have encyclopedic knowledge of thoroughbred bloodlines, commercial trends, sire statistics, and auction markets worldwide.`;

      const ANALYST_USER = `Client objective: ${clientGoal}

Here are ALL ${lots.length} lots from this catalogue:

${JSON.stringify(lotSummaries, null, 1)}

Process the catalogue and:
1. Analyse pedigree depth and quality for EVERY lot
2. Analyse commercial value based on sire, dam family, and market trends
3. Evaluate athletic potential from race records, ratings, and physical indicators
4. Consider the client's specific objective: "${clientGoal}"

Return results as structured JSON:
{
  "analysis_summary": "Executive summary of the catalogue quality and market context (max 80 words)",
  "total_lots_reviewed": ${lots.length},
  "client_goal": "${clientGoal}",
  "top_picks": [
    {
      "lot_number": "45",
      "horse_name": "Name",
      "score": 92,
      "pedigree_summary": "Detailed pedigree analysis",
      "commercial_value": "Commercial assessment",
      "athletic_potential": "Athletic evaluation",
      "risk_factors": ["risk 1", "risk 2"],
      "why_fits_goal": "Why this lot fits the client's specific goal",
      "insight": "Key analyst insight"
    }
  ],
  "value_opportunities": [
    {
      "lot_number": "78",
      "horse_name": "Name",
      "score": 75,
      "reason": "Why this lot represents good value relative to expected price",
      "upside": "What could make this horse outperform expectations"
    }
  ],
  "pinhook_prospects": [
    {
      "lot_number": "92",
      "horse_name": "Name",
      "score": 80,
      "current_appeal": "Why it may sell below potential now",
      "resale_thesis": "Why it should appreciate — sire trajectory, physical type, market timing",
      "target_resale": "Breeze-up / yearling-to-training / etc."
    }
  ],
  "hidden_gems": [
    {
      "lot_number": "310",
      "horse_name": "Name",
      "score": 70,
      "why_hidden": "Why this horse is likely to be overlooked",
      "upside_case": "Emerging sire line, underrated dam family, or unusual cross that could outperform"
    }
  ],
  "undervalued_lots": [
    {
      "lot_number": "123",
      "horse_name": "Name",
      "score": 78,
      "reason": "Why this lot is potentially undervalued",
      "value_indicator": "What makes it a value pick"
    }
  ],
  "avoid_list": [
    {
      "lot_number": "200",
      "horse_name": "Name",
      "reason": "Why to avoid"
    }
  ],
  "sire_trends": [
    {
      "sire_name": "Frankel",
      "lots_in_catalogue": 5,
      "assessment": "Market trend assessment",
      "standout_pattern": "Notable cross patterns (e.g. strong with certain dam sires)"
    }
  ],
  "recurring_dam_lines": [
    {
      "dam_or_family": "Blue Hen Dam Name",
      "lots_linked": ["45", "120", "305"],
      "significance": "Why this dam line is notable"
    }
  ],
  "pedigree_patterns": [
    {
      "pattern": "Sire × Dam Sire cross or bloodline concentration",
      "lots_involved": ["12", "45", "89"],
      "significance": "Track record of this cross — winners %, stakes performers, surface bias"
    }
  ],
  "strategic_summary": "A concise 100-word buying strategy for a professional buyer attending this sale. Include which sessions to focus on, budget allocation advice, and key lots not to miss.",
  "market_overview": "Overall market assessment for this sale"
}

RULES:
- TOP PICKS: Best 5 lots (expand to 10-20 for large catalogues 200+ lots)
- VALUE OPPORTUNITIES: 5 lots likely to sell below pedigree/performance merit
- PINHOOK PROSPECTS: 3-5 lots most likely to appreciate between sale cycles
- HIDDEN GEMS: 3-5 lots with underrated pedigrees or emerging sire lines
- UNDERVALUED LOTS: 5 lots that may be overlooked but have hidden value
- AVOID LIST: 3-5 lots with significant risk factors
- SIRE TRENDS: All sires represented with lot counts, trajectory, and standout crosses
- RECURRING DAM LINES: Dam families appearing 2+ times across the catalogue
- PEDIGREE PATTERNS: Productive sire/dam-sire crosses appearing multiple times
- STRATEGIC SUMMARY: Max 100 words, practical buying advice
- Always reference LOT NUMBERS
- Focus on practical buying insight — avoid generic commentary
- Be concise but expert-level

Return ONLY valid JSON. Start with {. End with }.`;

      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 12000,
          system: ANALYST_SYSTEM,
          messages: [{ role: "user", content: ANALYST_USER }],
        }),
      });

      if (!claudeRes.ok) {
        const errBody = await claudeRes.text();
        console.error(`Claude analyst error ${claudeRes.status}:`, errBody);
        throw new Error(`Claude API error ${claudeRes.status}`);
      }

      const claudeData = await claudeRes.json();
      let rawText = (claudeData.content?.[0]?.text || "").trim();

      let analysisResult: any = null;
      try {
        rawText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
        analysisResult = JSON.parse(rawText);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          try { analysisResult = JSON.parse(match[0]); } catch { analysisResult = null; }
        }
      }

      if (!analysisResult) {
        throw new Error("Failed to parse analyst response");
      }

      console.log(`[ANALYST] Top picks: ${analysisResult.top_picks?.length || 0}, Undervalued: ${analysisResult.undervalued_lots?.length || 0}`);

      return new Response(
        JSON.stringify({ success: true, ...analysisResult }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: any) {
    console.error("[PROCESS-CATALOGUE ERROR]", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
