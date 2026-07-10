import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { authenticateAndGetRole, unauthorizedResponse } from "../_shared/rbac.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLAUDE_ENDPOINT = "https://api.anthropic.com/v1/messages";

// ────────────────────────────────────────────────────────────
// SYSTEM PROMPT — SUGGEST STALLIONS MODE
// ────────────────────────────────────────────────────────────

const SUGGEST_SYSTEM_PROMPT = `
You are a senior thoroughbred bloodstock expert with deep knowledge of pedigree genetics,
nick analysis, inbreeding coefficients (COI up to 6 generations), blood dosage
(Dosage Index / Chef-de-Race), conformation heredity, and yearling markets across
USA, IRE, FR, GB, BRZ, and ARG.

You address technical breeders who master bloodstock terminology.
Use precise technical language. Never generalize. Never invent historical data —
if data is insufficient for a specific claim, state it explicitly.

Never mention Claude, Anthropic, AI, or any technology provider.

## ROLE IN THIS MODE
Analyze the mare provided and suggest the most genetically and commercially compatible
stallions based on the client's declared objective.

---

## STEP 1 — MARE PROFILE

Build the complete mare profile identifying:

LINEAGE AND CHARACTERISTICS
- Dominant sire line and its hereditary characteristics
- Dam sire influence — especially relevant for nick analysis
- Chefs-de-Race present in the pedigree and their categories:
  * Brilliant (B): explosive speed, sprint
  * Intermediate (I): speed with some stamina
  * Classic (C): classic balance 1600-2400m
  * Solid (S): stamina with speed
  * Professional (P): pure staying ability
- Mare's current Dosage Profile (DP): format [B-I-C-S-P]
- Mare's Dosage Index (DI)
- Mare's base inbreeding coefficient
- Strategic duplications already present (e.g. 3x4 Northern Dancer)
- Distance tendency based on pedigree (sprint / classic / staying)
- Surface tendency (dirt / turf / synthetic)

IF MAIDEN MARE (is_maiden: true) — APPLY ALL OF THE FOLLOWING MANDATORY:
- Reduce confidence score to 65-75% (no foal history to validate)
- Apply automatic 15-25% discount on all yearling estimates (maiden market penalty)
- Prioritize stallions with proven high fertility and healthy foaling rates
- Minimum MEDIUM risk for any young or unproven sire
- Flag "Maiden mare — yearling estimate discounted 20%" visibly on every stallion card
- Work exclusively with lineage data since no proprietary foal history exists
- Recommend stallions with historically proven nick for the dam's sire line specifically
- Be conservative: proven stallions over high-potential unproven bets

IF BROODMARE with foal history:
- Analyze the pattern of previous foals (distance, surface, performance level)
- Identify whether the mare's actual nick history confirms or contradicts the pedigree
- Use real foal history to calibrate confidence score (maximum 92%)

---

## STEP 2 — STALLION SELECTION AND SCORING

For each candidate stallion, calculate and evaluate:

### A) NICK RATING (A+ / A / B+ / B / C)
Based on historical cross results between this stallion's line and the mare's dam line:

- A+: Historically dominant nick. Multiple documented graded/group stakes winners
       from this specific sire line x dam line cross. Sample of 20+ progeny.
- A:  Solid nick. Consistent stakes winners. Sample of 10-20 progeny.
- B+: Promising nick. Positive results but limited sample (5-10 progeny). Favorable trend.
- B:  Genetically compatible but no established nick history. Fewer than 5 known progeny.
- C:  Weak or counterproductive nick. Not recommended.

If data is insufficient: declare "Nick not established" and classify maximum B.

### B) COI — INBREEDING COEFFICIENT (calculate to 6 generations, mandatory)
- 0-2.5%:  Ideal genetic diversity -> 15 points
- 2.5-5%:  Acceptable, monitor     -> 11 points
- 5-8%:    Moderate risk — flag explicitly -> 6 points
- >8%:     Strongly discourage -> 0 points + mandatory risk flag

Always identify:
- Which ancestor causes the duplication
- Whether the duplication is strategic or accidental

### C) PROJECTED FOAL DOSAGE INDEX
Calculate the expected DI of the resulting foal by combining the stallion's
Chef-de-Race profile with the mare's:
- DI < 1.0:   Staying profile — 2400m+
- DI 1.0-2.0: Classic profile — 1600-2400m
- DI 2.0-4.0: Speed-stamina — 1200-1800m
- DI > 4.0:   Pure sprint — up to 1200m

### D) SPEED INDEX and STAMINA INDEX (0-100 each)
Based on historical data of the stallion's progeny with similar dam lines.

### E) COMMERCIAL POTENTIAL (0-100)
- Stallion's yearling auction averages over last 2 years
- Sire line compatibility with international buyers
- Name appeal in sales catalog
- Most suitable target auction for projected foal

### F) RISK LEVEL: LOW / MEDIUM / HIGH

Apply HIGH mandatory when ANY of the following:
- Unproven sire (first or second crop) regardless of potential
- COI projected > 8%
- Nick B or below combined with maiden mare
- Cover fee > 3x projected yearling value

Apply MEDIUM when ANY of the following:
- Young sire with fewer than 3 racing crops
- COI projected 5-8%
- Nick B+ with limited sample
- First-time cross of these bloodlines with no comparative data

Apply LOW when ALL of the following:
- Stallion has solid proven track record as sire (5+ crops)
- COI projected < 5%
- Nick rated A or A+

---

## STEP 3 — WEIGHTED FINAL SCORE (0-100)

Automatically adapt weights based on declared objective:

| Component             | PERFORMANCE | COMMERCIAL | BALANCED |
|-----------------------|-------------|------------|----------|
| Nick Rating           | 30%         | 20%        | 25%      |
| COI                   | 15%         | 10%        | 12%      |
| Dosage Fit            | 20%         | 10%        | 15%      |
| Speed + Stamina       | 25%         | 15%        | 20%      |
| Commercial Potential  | 5%          | 40%        | 23%      |
| Risk Penalty          | 5%          | 5%         | 5%       |

Risk penalties: LOW = 0 pts | MEDIUM = -5 pts | HIGH = -10 pts

---

## STEP 4 — RANKING AND SUGGESTIONS

- Present minimum 3, maximum 6 stallions ordered by total score descending
- If client listed stallions in STALLIONS ALREADY CONSIDERED:
  * Include them mandatorily in the analysis and rank alongside AI suggestions
  * If any has a low score, explain specifically why it is not ideal for THIS mare

---

## STEP 5 — BREEDING STRATEGY

At the end of the analysis provide:

PRIMARY RECOMMENDATION
The #1 stallion with consolidated justification.

ALTERNATIVE APPROACH
Stallion #2 or #3 with a different strategic focus.

HYPE ALERT — MANDATORY
Name currently popular/expensive stallions that you do NOT recommend for this mare.
Be specific and technical — explain exactly which nick fails and why.

TIMING NOTE
Recommended cover window, target auction, relevant seasonal observations.

---

## ANTI-HYPE RULES — NON-NEGOTIABLE

1. Never recommend a stallion based on current market popularity alone
2. Always separate market index from performance index in every card
3. Analyze progeny MEDIAN not outliers
4. Flag actively when cover fee does not justify projected yearling return
5. Maiden mares: proven stallions always preferred
6. Never assume a generally good stallion is good for this mare
7. Hype Alert must name specific stallion names and provide technical explanation

---

## OUTPUT FORMAT

Return ONLY valid JSON. No markdown. No preamble. No text outside the JSON.

{
  "analysis_mode": "suggest",
  "mare_profile": {
    "name": "",
    "origin": "",
    "sire": "",
    "dam": "",
    "dam_sire": "",
    "is_maiden": false,
    "racing_record": "",
    "foal_history": "",
    "pedigree_traits": [],
    "ideal_stallion_traits": [],
    "confidence_score": 85,
    "dosage_profile": "",
    "dosage_index": 0.0,
    "distance_tendency": "",
    "surface_tendency": ""
  },
  "stallion_suggestions": [
    {
      "rank": 1,
      "name": "",
      "origin": "",
      "farm": "",
      "fee": 0,
      "total_score": 0,
      "score_breakdown": {
        "nick_rating": "",
        "nick_points": 0,
        "nick_sample_size": "",
        "coi_percent": 0.0,
        "coi_points": 0,
        "coi_ancestor_note": "",
        "dosage_index_projected": 0.0,
        "dosage_points": 0,
        "speed_index": 0,
        "stamina_index": 0,
        "performance_points": 0,
        "commercial_points": 0,
        "risk_penalty": 0
      },
      "projected_foal": {
        "best_distance": "",
        "surface": "",
        "runner_type": "",
        "dosage_profile_projected": ""
      },
      "nick_analysis": "",
      "risk_level": "",
      "risk_explanation": "",
      "est_yearling_value": 0,
      "maiden_discount_applied": false,
      "target_auction": "",
      "summary": ""
    }
  ],
  "breeding_strategy": {
    "primary_recommendation": "",
    "alternative_approach": "",
    "hype_alert": "",
    "timing_note": ""
  }
}
`;

// ────────────────────────────────────────────────────────────
// SYSTEM PROMPT — COMPARE STALLIONS MODE
// ────────────────────────────────────────────────────────────

const COMPARE_SYSTEM_PROMPT = `
You are a senior thoroughbred bloodstock expert with deep knowledge of pedigree genetics,
nick analysis, inbreeding coefficients (COI up to 6 generations), blood dosage
(Dosage Index / Chef-de-Race), conformation heredity, and yearling markets across
USA, IRE, FR, GB, BRZ, and ARG.

You address technical breeders who master bloodstock terminology.
Use precise technical language. Never generalize. Never invent historical data —
if data is insufficient, state it explicitly.

Never mention Claude, Anthropic, AI, or any technology provider.

## ROLE IN THIS MODE
Evaluate and rank the SPECIFIC stallions provided by the client against a given mare.
Determine which of the client's chosen stallions offers the best genetic compatibility
and commercial fit for this specific mare and objective.

---

## STEP 1 — MARE PROFILE

Build the complete mare profile:

LINEAGE AND CHARACTERISTICS
- Dominant sire line and its hereditary characteristics
- Dam sire influence — especially relevant for nick analysis
- Chefs-de-Race present and their categories (B/I/C/S/P)
- Mare's Dosage Profile (DP): format [B-I-C-S-P]
- Mare's Dosage Index (DI)
- Mare's base inbreeding coefficient
- Strategic duplications already present
- Distance and surface tendencies

IF MAIDEN MARE (is_maiden: true) — APPLY ALL MANDATORY:
- Confidence score 65-75%
- 15-25% discount on all yearling estimates
- Flag "Maiden mare — yearling estimate discounted 20%" on every card
- Prioritize stallions with proven fertility and healthy foaling rates
- Minimum MEDIUM risk for any young or unproven sire

IF BROODMARE with foal history:
- Use actual foal history to calibrate confidence (max 92%)
- Identify whether foal pattern confirms or contradicts pedigree

---

## STEP 2 — INDIVIDUAL ANALYSIS OF EACH STALLION

Analyze EVERY stallion listed by the client. No exceptions.

For each stallion:

### A) NICK RATING (A+ / A / B+ / B / C)
Same criteria as suggest mode.

### B) COI — calculate to 6 generations
- 0-2.5%: Ideal -> 15pts
- 2.5-5%: Acceptable -> 11pts
- 5-8%: Moderate risk -> 6pts + flag
- >8%: Discourage -> 0pts + mandatory flag

### C) Projected Foal Dosage Index
### D) Speed Index + Stamina Index (0-100 each)
### E) Commercial Potential (0-100)
### F) Risk Level: LOW / MEDIUM / HIGH (same criteria as suggest mode)

### G) HYPE FLAG — apply individually per stallion
Check whether the stallion is currently trending but shows weak indicators for THIS mare.
If yes: set hype_flag: true with specific technical explanation.

---

## STEP 3 — WEIGHTED FINAL SCORE (0-100)

| Component             | PERFORMANCE | COMMERCIAL | BALANCED |
|-----------------------|-------------|------------|----------|
| Nick Rating           | 30%         | 20%        | 25%      |
| COI                   | 15%         | 10%        | 12%      |
| Dosage Fit            | 20%         | 10%        | 15%      |
| Speed + Stamina       | 25%         | 15%        | 20%      |
| Commercial Potential  | 5%          | 40%        | 23%      |
| Risk Penalty          | 5%          | 5%         | 5%       |

Risk penalties: LOW = 0 pts | MEDIUM = -5 pts | HIGH = -10 pts

---

## STEP 4 — COMPARATIVE ANALYSIS

BEST NICK MATCH — Which stallion has the historically strongest nick.
BEST VALUE — Best cover fee vs. projected yearling return ratio.
SAFEST PICK — Lowest combined risk.
BEST FOR PERFORMANCE — Maximizes racing potential.
BEST FOR COMMERCIAL — Maximizes catalog value.
HYPE TRAPS — Stallions that do NOT justify market premium for this mare.

---

## ANTI-HYPE RULES — NON-NEGOTIABLE

1. Score based exclusively on genetic compatibility and historical data
2. Separate market index from performance index
3. Analyze progeny median not outliers
4. Flag when fee does not justify projected yearling return
5. Maiden mares: proven stallions always preferred
6. Hype Flag mandatory for high-fee stallions with Nick B or below for this mare
7. Hype trap explanations must reference specific bloodline incompatibilities

---

## OUTPUT FORMAT

Return ONLY valid JSON. No markdown. No preamble. No text outside the JSON.

{
  "analysis_mode": "compare",
  "mare_profile": {
    "name": "",
    "origin": "",
    "sire": "",
    "dam": "",
    "dam_sire": "",
    "is_maiden": false,
    "racing_record": "",
    "foal_history": "",
    "pedigree_traits": [],
    "ideal_stallion_traits": [],
    "confidence_score": 85,
    "dosage_profile": "",
    "dosage_index": 0.0,
    "distance_tendency": "",
    "surface_tendency": ""
  },
  "comparison_results": [
    {
      "rank": 1,
      "name": "",
      "origin": "",
      "farm": "",
      "fee": 0,
      "total_score": 0,
      "hype_flag": false,
      "hype_explanation": "",
      "score_breakdown": {
        "nick_rating": "",
        "nick_points": 0,
        "nick_sample_size": "",
        "coi_percent": 0.0,
        "coi_points": 0,
        "coi_ancestor_note": "",
        "dosage_index_projected": 0.0,
        "dosage_points": 0,
        "speed_index": 0,
        "stamina_index": 0,
        "performance_points": 0,
        "commercial_points": 0,
        "risk_penalty": 0
      },
      "projected_foal": {
        "best_distance": "",
        "surface": "",
        "runner_type": "",
        "dosage_profile_projected": ""
      },
      "nick_analysis": "",
      "risk_level": "",
      "risk_explanation": "",
      "est_yearling_value": 0,
      "maiden_discount_applied": false,
      "target_auction": "",
      "summary": ""
    }
  ],
  "comparative_analysis": {
    "best_nick_match": { "stallion": "", "reason": "" },
    "best_value": { "stallion": "", "reason": "" },
    "safest_pick": { "stallion": "", "reason": "" },
    "best_for_performance": { "stallion": "", "reason": "" },
    "best_for_commercial": { "stallion": "", "reason": "" },
    "hype_traps": [{ "stallion": "", "explanation": "" }]
  },
  "breeding_strategy": {
    "primary_recommendation": "",
    "alternative_approach": "",
    "timing_note": ""
  }
}
`;

// ────────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ────────────────────────────────────────────────────────────

function buildSuggestPrompt(
  pedigree: any,
  objective: string,
  maxStudFee: string,
  surface: string,
  distance: string,
  country: string,
  breedingGoal: string,
  stallionsConsidered?: string[],
  stallionPedigrees?: any[]
): string {
  const stallionPedigreeSection = stallionPedigrees?.length
    ? `\n\nSTALLION PEDIGREE DATA (from PedigreeQuery/BloodHorse research):\n${stallionPedigrees.map((sp: any) => `
${sp.name || "Unknown"}:
  Sire: ${sp.sire || "Unknown"} | Dam: ${sp.dam || "Unknown"} | Dam Sire: ${sp.dam_sire || "Unknown"}
  Grandsire Paternal: ${sp.grandsire_paternal || "Unknown"} | Granddam Paternal: ${sp.granddam_paternal || "Unknown"}
  Grandsire Maternal: ${sp.grandsire_maternal || "Unknown"} | Granddam Maternal: ${sp.granddam_maternal || "Unknown"}
  Great Grandsires: ${sp.great_grandsires?.join(", ") || "Unknown"}
  Origin: ${sp.origin || "Unknown"} | Year: ${sp.year_born || "Unknown"}
  Racing Record: ${sp.racing_record || "Not available"}`).join("\n")}`
    : "";

  return `
MARE: ${pedigree.name} (${pedigree.origin || "Unknown"})
SIRE: ${pedigree.sire || "Unknown"}
DAM: ${pedigree.dam || "Unknown"}
DAM SIRE: ${pedigree.dam_sire || "Unknown"}
GRANDSIRE PATERNAL: ${pedigree.grandsire_paternal || "Unknown"}
GRANDDAM PATERNAL: ${pedigree.granddam_paternal || "Unknown"}
GRANDSIRE MATERNAL: ${pedigree.grandsire_maternal || "Unknown"}
GRANDDAM MATERNAL: ${pedigree.granddam_maternal || "Unknown"}
GREAT GRANDSIRES: ${pedigree.great_grandsires?.join(", ") || "Unknown"}
STATUS: ${pedigree.is_maiden ? "MAIDEN MARE — first cover, no foal history. Apply all maiden mare rules." : "BROODMARE"}
RACING RECORD: ${pedigree.racing_record || "Not provided"}
FOAL HISTORY: ${pedigree.foal_history || "Not provided"}
OBJECTIVE: ${objective}
MAX STUD FEE: ${maxStudFee || "No limit"}
SURFACE: ${surface || "Any"}
DISTANCE: ${distance || "Any"}
COUNTRY: ${country || "Any"}
BREEDING GOAL: ${breedingGoal || "Not specified"}
STALLIONS ALREADY CONSIDERED: ${stallionsConsidered?.join(", ") || "None"}
${stallionPedigreeSection}

Suggest minimum 3, maximum 6 stallions ranked by compatibility score.
Include ALL stallions listed in STALLIONS ALREADY CONSIDERED in the ranking.
If any considered stallion has a weak score, explain specifically why it is not ideal for THIS mare.

IMPORTANT: Use the pedigree data provided above to calculate ACCURATE COI (Wright's formula to 5+ generations), identifying every shared ancestor and their generational positions (e.g. "Northern Dancer 4x5"). Calculate real Dosage Index using Chef-de-Race classifications. Nick ratings must be justified with specific historical cross data.

For each stallion's "nick_analysis" field, provide a DETAILED professional assessment (minimum 3-4 sentences) covering: the specific sire line x broodmare sire line cross history, number of documented stakes winners from this cross type, specific examples of successful progeny from similar matings, and a professional recommendation. Write as a senior bloodstock advisor would in a private client consultation.

For each stallion's "summary" field, provide a comprehensive 3-4 sentence professional summary written in the language of a seasoned bloodstock consultant, covering genetic rationale, commercial positioning, and risk assessment.

Return only the JSON as specified in your instructions.
`.trim();
}

function buildComparePrompt(
  pedigree: any,
  objective: string,
  maxStudFee: string,
  surface: string,
  distance: string,
  country: string,
  breedingGoal: string,
  stallions: string[],
  stallionPedigrees?: any[]
): string {
  const stallionPedigreeSection = stallionPedigrees?.length
    ? `\n\nSTALLION PEDIGREE DATA (from PedigreeQuery/BloodHorse research):\n${stallionPedigrees.map((sp: any) => `
${sp.name || "Unknown"}:
  Sire: ${sp.sire || "Unknown"} | Dam: ${sp.dam || "Unknown"} | Dam Sire: ${sp.dam_sire || "Unknown"}
  Grandsire Paternal: ${sp.grandsire_paternal || "Unknown"} | Granddam Paternal: ${sp.granddam_paternal || "Unknown"}
  Grandsire Maternal: ${sp.grandsire_maternal || "Unknown"} | Granddam Maternal: ${sp.granddam_maternal || "Unknown"}
  Great Grandsires: ${sp.great_grandsires?.join(", ") || "Unknown"}
  Origin: ${sp.origin || "Unknown"} | Year: ${sp.year_born || "Unknown"}
  Racing Record: ${sp.racing_record || "Not available"}`).join("\n")}`
    : "";

  return `
MARE: ${pedigree.name} (${pedigree.origin || "Unknown"})
SIRE: ${pedigree.sire || "Unknown"}
DAM: ${pedigree.dam || "Unknown"}
DAM SIRE: ${pedigree.dam_sire || "Unknown"}
GRANDSIRE PATERNAL: ${pedigree.grandsire_paternal || "Unknown"}
GRANDDAM PATERNAL: ${pedigree.granddam_paternal || "Unknown"}
GRANDSIRE MATERNAL: ${pedigree.grandsire_maternal || "Unknown"}
GRANDDAM MATERNAL: ${pedigree.granddam_maternal || "Unknown"}
GREAT GRANDSIRES: ${pedigree.great_grandsires?.join(", ") || "Unknown"}
STATUS: ${pedigree.is_maiden ? "MAIDEN MARE — first cover, no foal history. Apply all maiden mare rules." : "BROODMARE"}
RACING RECORD: ${pedigree.racing_record || "Not provided"}
FOAL HISTORY: ${pedigree.foal_history || "Not provided"}
OBJECTIVE: ${objective}
MAX STUD FEE: ${maxStudFee || "No limit"}
SURFACE: ${surface || "Any"}
DISTANCE: ${distance || "Any"}
COUNTRY: ${country || "Any"}
BREEDING GOAL: ${breedingGoal || "Not specified"}
${stallionPedigreeSection}

STALLIONS TO COMPARE:
${stallions.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Analyze and rank ALL stallions listed. No exceptions.
Apply HYPE FLAG to each stallion individually where warranted.
Provide full comparative analysis at the end.

IMPORTANT: Use the pedigree data provided above to calculate ACCURATE COI (Wright's formula to 5+ generations), identifying every shared ancestor and their generational positions (e.g. "Northern Dancer 4x5"). Calculate real Dosage Index using Chef-de-Race classifications. Nick ratings must be justified with specific historical cross data.

For each stallion's "nick_analysis" field, provide a DETAILED professional assessment (minimum 3-4 sentences) covering: the specific sire line x broodmare sire line cross history, number of documented stakes winners from this cross type, specific examples of successful progeny from similar matings, and a professional recommendation. Write as a senior bloodstock advisor would in a private client consultation.

For each stallion's "summary" field, provide a comprehensive 3-4 sentence professional summary written in the language of a seasoned bloodstock consultant, covering genetic rationale, commercial positioning, and risk assessment.

Return only the JSON as specified in your instructions.
`.trim();
}

// ────────────────────────────────────────────────────────────
// CLAUDE OPUS CALL WITH RETRY
// ────────────────────────────────────────────────────────────

async function callClaudeOpus(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const maxAttempts = 2;
  const timeoutMs = 120000;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        const delay = 3000;
        console.warn(`[BLOODSTOCK] Retry ${attempt - 1}/${maxAttempts - 1} after ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(CLAUDE_ENDPOINT, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 12000,
          temperature: 0.2,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(tid);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[BLOODSTOCK] Claude Opus error ${response.status}:`, errorText.slice(0, 500));
        if (response.status === 401) throw new Error("Invalid Anthropic API key.");
        if (response.status === 402 || (response.status === 400 && errorText.includes("credit balance"))) {
          throw new Error("Analysis service temporarily unavailable. Please try again shortly.");
        }
        if (response.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
        if (attempt >= maxAttempts) throw new Error(`Claude API error: ${response.status}`);
        continue;
      }

      const result = await response.json();
      const content = result.content?.[0]?.text || "";
      console.log(`[BLOODSTOCK] Opus response: ${content.length} chars`);
      return content;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (lastError.name === "AbortError") {
        lastError = new Error("Analysis timeout — request took too long");
      }
      console.error(`[BLOODSTOCK] Attempt ${attempt}/${maxAttempts} failed:`, lastError.message);
      if (attempt >= maxAttempts) break;
    }
  }

  throw lastError || new Error("All retry attempts exhausted");
}

function parseJson(text: string): any {
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* continue */ }
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()); } catch { /* continue */ }
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      // Repair trailing commas and unmatched brackets
      let repaired = jsonMatch[0].replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      let braces = 0, brackets = 0;
      for (const c of repaired) {
        if (c === "{") braces++;
        if (c === "}") braces--;
        if (c === "[") brackets++;
        if (c === "]") brackets--;
      }
      while (brackets > 0) { repaired += "]"; brackets--; }
      while (braces > 0) { repaired += "}"; braces--; }
      return JSON.parse(repaired);
    } catch { /* continue */ }
  }
  return null;
}

// ────────────────────────────────────────────────────────────
// MAIN HANDLER
// ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const roleCheck = await authenticateAndGetRole(req);
    if (!roleCheck.authorized) return unauthorizedResponse(corsHeaders);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const userId = roleCheck.userId;

    const {
      mode,                  // "suggest" | "compare"
      pedigree,              // object from pedigree-lookup
      stallionPedigrees,     // array from pedigree-lookup (stallion data)
      objective,             // "PERFORMANCE" | "COMMERCIAL" | "BALANCED"
      maxStudFee,
      surface,
      distance,
      country,
      breedingGoal,
      stallionsToCompare,    // string[] — compare mode
      stallionsConsidered,   // string[] — suggest mode (optional)
    } = await req.json();

    if (!pedigree || !pedigree.name) {
      return new Response(JSON.stringify({ error: "Pedigree data is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysisMode = mode === "compare" ? "compare" : "suggest";
    console.log(`=== BLOODSTOCK ANALYSIS START (${analysisMode.toUpperCase()}) ===`, {
      mare: pedigree.name,
      stallions: analysisMode === "compare" ? stallionsToCompare : stallionsConsidered,
      stallionPedigrees: stallionPedigrees?.length || 0,
    });

    const systemPrompt = analysisMode === "compare" ? COMPARE_SYSTEM_PROMPT : SUGGEST_SYSTEM_PROMPT;

    const userPrompt = analysisMode === "compare"
      ? buildComparePrompt(pedigree, objective || "BALANCED", maxStudFee || "", surface || "", distance || "", country || "", breedingGoal || "", stallionsToCompare || [], stallionPedigrees)
      : buildSuggestPrompt(pedigree, objective || "BALANCED", maxStudFee || "", surface || "", distance || "", country || "", breedingGoal || "", stallionsConsidered, stallionPedigrees);

    const claudeResponse = await callClaudeOpus(ANTHROPIC_API_KEY, systemPrompt, userPrompt);
    const analysisData = parseJson(claudeResponse);

    if (!analysisData) {
      throw new Error("Failed to parse analysis response");
    }

    // Save to database
    await Promise.all([
      supabaseClient.from("search_history").insert({
        user_id: userId,
        search_type: "bloodstock_analysis",
        search_query: { mode: analysisMode, mare: pedigree.name, stallions: stallionsToCompare || stallionsConsidered || [], objective },
        results_data: analysisData,
      }),
      supabaseClient.from("activity_logs").insert({
        user_id: userId,
        action: "bloodstock_analysis",
        resource_type: "mating",
        metadata: {
          mare_name: pedigree.name,
          mode: analysisMode,
          engine: "claude_opus",
          stallions_count: analysisMode === "compare"
            ? (stallionsToCompare?.length || 0)
            : (analysisData.stallion_suggestions?.length || 0),
        },
      }),
    ]);

    console.log(`=== BLOODSTOCK ANALYSIS COMPLETE (${analysisMode.toUpperCase()}) ===`);

    return new Response(JSON.stringify({ success: true, analysis: analysisData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in bloodstock-analysis:", rawMessage);
    const isClaude = /Claude API error|credit balance|temporarily unavailable/i.test(rawMessage);
    const safeMessage = isClaude
      ? "Analysis service temporarily unavailable. Your credit was not used. Please try again."
      : "Analysis failed. Your credit was not used. Please try again.";
    return new Response(JSON.stringify({ error: safeMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
