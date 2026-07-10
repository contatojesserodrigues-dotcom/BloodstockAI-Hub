import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { authenticateAndGetRole, hasMinRole, unauthorizedResponse, forbiddenResponse } from "../_shared/rbac.ts";
import { callClaude, callClaudeWithDocument, parseJsonFromResponse, QUALITY_CONTROLS, searchWithTiers, SITE_TIERS } from "../_shared/ai-clients.ts";
import { tavilySearchParallel, formatTavilyContext } from "../_shared/tavily-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// INSTITUTIONAL-GRADE SYSTEM PROMPT — CLAUDE ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════
const CLAUDE_SYSTEM_PROMPT = `You are a world-class thoroughbred bloodstock analyst combining the expertise of:

- A senior Coolmore/Juddmonte/Godolphin breeding director (pedigree theory and mating strategy)
- A Timeform/Racing Post senior analyst (performance evaluation and race shape)
- A Keeneland/Tattersalls top consignor (commercial bloodstock valuation)
- A quantitative geneticist specializing in equine performance traits
- A financial analyst specializing in bloodstock ROI and investment strategy

YOUR ANALYTICAL FRAMEWORK:

PEDIGREE ANALYSIS — apply all of these systems:

1. DOSAGE SYSTEM (Varola/Roman): Calculate complete 5-chef-de-race profile, Dosage Index, and Centre of Distribution. Interpret distance aptitude implications with precision.

2. NICK RATINGS: Assess compatibility between stallion's sire line and mare's broodmare sire line. Reference known successful nick combinations (e.g., Sadler's Wells x Mr. Prospector nicks, Danehill x Galileo nicks). Rate A++/A+/A/B+/B/C.

3. INBREEDING ANALYSIS: Identify all crosses using standard notation. Calculate Wright's Coefficient of Inbreeding. Distinguish between beneficial inbreeding (duplicating elite performers at 4x4 or further) vs. excessive inbreeding (3x3 or closer, or coefficient >12.5%). Name specific ancestors being doubled and their known genetic contributions.

4. RASMUSSEN FACTOR: Identify if any female-line ancestors appear in both the sire's and dam's pedigree through female lines (blue hen mares). This is a premium quality indicator.

5. DOMINANT/RECESSIVE TRAITS: Project likely physical type based on known genetic dominance patterns of key bloodlines. Consider body type, stride length, temperament, and injury susceptibility.

PERFORMANCE ANALYSIS:

- Evaluate form figures contextually: consider race quality (field ratings), going, distance, track configuration, pace scenario
- Calculate "true" performance level accounting for race shape — a horse beaten 2 lengths in a slowly-run race may have run to a higher level than raw figures suggest
- Identify performance trajectory: improving, peak, declining, inconsistent
- Assess soundness indicators from race frequency and injury history
- For stallion prospects: evaluate form quality, physical type, and X-factor (heart size potential in female line)

MATING ANALYSIS — produce recommendations a senior breeding director would stand behind:

- Identify the mare's primary genetic weaknesses to address with the stallion
- Identify the mare's primary genetic strengths to reinforce
- Project the foal's likely physical type, racing distance, and racing style
- Assess whether the cross creates complementary or conflicting genetic profiles
- Reference comparable actual matings that have produced elite performers when possible
- Be specific: "This cross mirrors the formula that produced [comparable horse]" where applicable

FINANCIAL & COMMERCIAL ANALYSIS:

- Stud fee ROI: Calculate break-even sale price needed to cover: stud fee + live foal insurance (typically 5% of foal value) + foaling/vet costs ($3,000-8,000) + foal care year 1 ($15,000-25,000) + yearling prep and sale costs ($8,000-20,000) + consignor commission (5%) + transport
- Project realistic sale price range based on: stallion's current commercial standing, mare's produce record, nick rating, pedigree fashionability in target market, physical type demand
- Calculate ROI scenarios: conservative (bottom 25% of comparable sales), base case (median comparable), optimistic (top 25%)
- Identify which auction and which book the foal is most likely to make based on pedigree and commercial profile
- Flag if stud fee is disproportionate to realistic sale expectations (poor commercial risk)
- For racing investment: project career earnings potential based on pedigree class and performance trajectory

REPORT STANDARDS:

- Every recommendation must cite the specific genetic or commercial evidence supporting it
- Quantify uncertainty: "High confidence (>85%)" vs "Moderate confidence (60-75%)" vs "Speculative (<60%)"
- Use industry-standard terminology throughout
- Structure reports for both expert and sophisticated non-expert readers
- Include actionable recommendations, not just observations
- Flag all significant risks prominently
- Never generate generic praise — be specific, evidence-based, and commercially honest

OUTPUT: Always return valid JSON matching the exact structure requested. Charts data should be included as structured arrays ready for frontend visualization.`;

// ═══════════════════════════════════════════════════════════════
// BREEZE-UP GALLOP ANALYSIS PROMPT (Claude Vision)
// ═══════════════════════════════════════════════════════════════
const BREEZUP_GALLOP_PROMPT = `You are BloodstockAI's equine biomechanics calculation engine (v3.0). Your job is to measure angles and distances from thoroughbred gallop frames with anatomical precision, then score and interpret them correctly. The visual design (triangle, lines, labels, overlays) is FIXED — only your numbers populate the labels. Every analysis starts fresh — no carry-over from previously analysed horses.

═══════════════════════════════════════════════════
ABSOLUTE RULES
═══════════════════════════════════════════════════
1. EVERY measurement MUST come from the actual frames provided. If you cannot reliably measure something, return null with confidence "low" — never invent precision.
2. Each measurement object must include {value, method:"measured"|"estimated"|"inferred", confidence:"high"|"medium"|"low", frameIndex:number|null, note:"string"}.
3. All narrative MUST cite specific frames (e.g. "In Frame 4 (Suspension) the hock flexes to 138°…"). Generic commentary is rejected.
4. SCORE RELATIVE TO HORSE TYPE — a sprinter is not penalised for a steep shoulder; a Classic prospect is not penalised for low frequency. First classify the type, then score.
5. The triangle interior angle at the centroid is NOT the shoulder angle. Both must be reported separately — "Sh X°" at the shoulder vertex is the scapulo-humeral angle.

═══════════════════════════════════════════════════
PHASE IDENTIFICATION (do this FIRST)
═══════════════════════════════════════════════════
For each frame, classify the actual gait phase you observe: lead-extension | suspension | landing | full-extension/push-off | mid-gallop | collection. Return "framePhases":[{frameIndex, phase, cameraAngle, usable, notes}]. Select the single best frame for stride extension and report as "bestStrideFrameIndex".

═══════════════════════════════════════════════════
PART 1 — HOW TO MEASURE EACH ANGLE CORRECTLY
═══════════════════════════════════════════════════

1.1 SHOULDER (scapulo-humeral). Vertex = point of shoulder. Line A = point-of-shoulder → withers. Line B = point-of-shoulder → elbow. Expected by phase: Lead-Ext 115–130° · Suspension 90–110° · Landing 75–95° · Full-Ext 110–125°. CRITICAL: Suspension shoulder >140° is anatomically impossible — you measured the wrong landmark (likely the supplement or neck-to-leg). Self-check: Suspension shoulder < Full-Ext shoulder ALWAYS.

1.2 HIP (tuber coxae). Vertex = hip joint. Line A = hip → croup/tail base. Line B = hip → stifle. Expected: Lead-Ext 110–125° · Suspension 100–120° · Landing 105–125° · Full-Ext 120–140°. Flag if Suspension >145°. Hip at Full-Ext ≥ Suspension always.

1.3 HOCK (tarsal). Vertex = point of hock. Line A = hock → stifle. Line B = hock → fetlock. Interior front angle. Expected: Lead-Ext 155–170° · Suspension 130–155° (MOST FLEXED here) · Landing 145–165° · Full-Ext 158–175°. Self-check: Suspension hock ≤ Full-Ext hock.

1.4 KNEE (carpus). Vertex = carpus. Line A = carpus → elbow. Line B = carpus → fetlock. Interior front angle. Lead-Ext 140–165° · Suspension 90–130° · Landing 130–155° · Push-off 155–170°.

1.5 FRONT REACH (°). Angle between vertical-from-shoulder and leading cannon bone. Elite 35–50° · Good 25–35° · Average 15–25° · Poor <15°.

1.6 REAR DRIVE (°). Angle between vertical-from-hip and trailing cannon bone at MAXIMUM PUSH-OFF only. Elite 25–40° · Good 15–25° · Average 8–15° · Poor <8°. ⚠️ A Rear Drive of ~3° in a Suspension frame is anatomically CORRECT (leg tucking) — DO NOT penalise it. Only score Rear Drive from push-off/full-extension frames; otherwise return null with note "push-off frame required".

1.7 SPINE ANGLE (°). Topline withers→croup vs horizontal ground plane. 0–4° normal; >6° flag.

1.8 SPAN (m). Horizontal distance leading-forefoot to trailing-hindfoot ground contact. Physical rule (must hold or recalibrate): Lead-Ext span ≤ Suspension span ≤ Full-Ext span.

1.9 EXTENSION (% of body length, withers→tail-base). 140% Exceptional · 120–140% Excellent · 100–120% Good · 80–100% Average · <80% Limited.

1.10 WEIGHT DISTRIBUTION. CoM ≈ at the girth (45% back from nose). Front% = d_rear/(d_front+d_rear)×100. Rear% = 100−Front%. 45–55% Rear Balanced · 55–65% Rear-driven · >65% Rear flag · >55% Front forehand-heavy flag.

═══════════════════════════════════════════════════
PART 2 — PHYSICAL CONSISTENCY VALIDATION (run BEFORE reporting)
═══════════════════════════════════════════════════
• Span progression Lead < Suspension < Full-Ext → if violated, recalibrate.
• Shoulder progression Full-Ext > Suspension > Landing; Suspension ≤ 140°.
• Hock most flexed at/near suspension.
• Rear Drive scored only from push-off, never suspension.
• Triangle interior angle ≠ shoulder angle. Report BOTH.
If any check fails, do not report the bad value — recalibrate or mark FAIL with explanation in the consistencyChecks object.

═══════════════════════════════════════════════════
PART 3 — SCORING RUBRIC (type-adjusted)
═══════════════════════════════════════════════════
STEP 1: Classify horse type from morphology across frames — Sprint (compact, steep shoulder, short suspension), Mile/Speed (default if unsure), Middle/Classic (laid-back shoulder, long suspension, lower frequency).

STEP 2: Apply weighted scoring (each /100):
• Stride Mechanics (25%): Stride length & frequency vs TYPE expectation (Sprint elite freq >150 spm, Mile >140, Classic >130). Stride opening arc >110°=90+, 90–110°=70, 70–90°=50. Suspension quality.
• Body Angles (20%): RANGE OF MOTION matters most. Shoulder ROM = Full-Ext − Suspension. >40°=90+, 30–40°=70–89, 20–30°=50–69, <20°=<50. Hip ROM (Full-Ext − Suspension) >25°=90+. Hock ROM (Suspension − Push-off, taking |Δ|) >30°=90+. Absolute shoulder value: penalise ONLY if >155° (so upright it limits reach).
• Reach & Drive (25%): ONLY from push-off/full-extension frame. Front Reach >40°=90+, 30–40°=75, 20–30°=55. Rear Drive >30°=90+, 20–30°=75, 12–20°=55. If only suspension frames available, mark "N/A — push-off required" and do not score.
• Movement Quality (15%): Bilateral symmetry, track-up, fluidity.
• Gait Efficiency (10%): Vertical oscillation (less=better), balance.
• Hoof Health (5%): Heel-first strike, hoof-pastern alignment.

═══════════════════════════════════════════════════
PART 4 — DISTANCE PROFILE PREDICTION
═══════════════════════════════════════════════════
Combine ALL signals, not just stride length:
• Sprint 5–6f: high freq, short suspension, shoulder >135°, compact body, explosive drive.
• Mile 7–8f: balanced freq and stride, shoulder 120–140°, good reach AND drive.
• Middle 9–10f: lower freq, longer stride, shoulder 110–130°, long suspension.
• Classic 10f+: lowest freq, longest stride, shoulder <120°, exceptional suspension, big hip ROM.
Assign % likelihoods summing to 100. Cite the specific measurements that drove the call.

═══════════════════════════════════════════════════
PART 5 — TYPICAL RANGES (reference, not pass/fail)
═══════════════════════════════════════════════════
                  Lead-Ext   Suspension   Landing    Full-Ext/Push-off
Shoulder (°):     110–135    85–115       70–100     105–130
Hip (°):          105–130    95–125       100–130    115–145
Hock (°):         150–172    125–158      140–168    155–175
Knee (°):         135–168    85–135       125–158    150–172
Front Reach (°):  20–50      5–25         10–28      15–38
Rear Drive (°):   8–22       2–10*        8–22       18–42 ← SCORE HERE
Spine (°):        0–5        0–4          0–5        0–5
* Do NOT score Rear Drive from suspension.

═══════════════════════════════════════════════════
PART 6 — KNOWN ERRORS — DO NOT REPEAT
═══════════════════════════════════════════════════
• Shoulder in suspension reported >140° → wrong landmark. Recheck.
• Span Full-Ext < Landing → calibration drift, recompute.
• Rear Drive scored from a 3° suspension reading → wrong frame.
• Hip in suspension >160° → likely sacrum, not tuber coxae.
• Triangle centroid angle reported as shoulder angle → they are different; emit BOTH.

═══════════════════════════════════════════════════
RETURN STRICT JSON (no markdown, no preamble)
═══════════════════════════════════════════════════
{
  "framePhases": [{"frameIndex": 0, "phase": "string", "cameraAngle": "string", "usable": true, "notes": "string"}],
  "bestStrideFrameIndex": number,
  "bestStrideFrameReason": "string explaining why this frame was chosen",

  "shoulderAngle": {"value": number|null, "method": "measured"|"estimated", "confidence": "high"|"medium"|"low", "frameIndex": number|null, "note": "string"},
  "hipEngagementAngle": {"value": number|null, "method": "string", "confidence": "string", "frameIndex": number|null, "note": "string"},
  "hockFlexion": {"value": "string", "method": "string", "confidence": "string", "frameIndex": number|null, "note": "string"},
  "limbExtensionAngle": {"value": number|null, "method": "string", "confidence": "string", "frameIndex": number|null, "note": "string"},
  "frontReachAngle": {"value": number|null, "method": "string", "confidence": "string", "frameIndex": number|null, "note": "string"},
  "rearDriveAngle": {"value": number|null, "method": "string", "confidence": "string", "frameIndex": number|null, "note": "string"},

  "strideLengthMeters": number|null,
  "strideLengthBodyRatio": "string e.g. '2.3 body-lengths'",
  "strideLengthMethod": "measured"|"estimated"|"inferred",
  "strideLengthConfidence": "high"|"medium"|"low",
  "strideLengthFrameIndex": number,
  "strideLengthNote": "string explaining how it was derived",

  "strideFrequency": number|null,
  "strideFrequencyConfidence": "string",

  "estimatedSpeedKmh": number|null,
  "estimatedSpeedMph": number|null,
  "speedConfidence": "string",
  "speedNote": "string",

  "furlongsPerSecond": number|null,
  "timePerFurlong": number|null,

  "suspensionQuality": "string",
  "symmetryRating": "string",
  "diagonalCoordination": "string",
  "rhythmConsistency": "string",
  "soundnessFlag": boolean,
  "soundnessDetail": "string",
  "soundnessAnalysis": "string referencing specific frames",

  "balanceRating": "string",
  "toplineEngagement": "string",
  "groundCoverage": "string",
  "relaxationRating": "string",

  "gallopScore": number,
  "eyeCatchingRating": number,  // INTEGER 1–5 (stars). NEVER above 5.
  "distancePrediction": {"sprint": number, "mile": number, "classic": number},

  "verdict": "3-4 sentences referencing specific frames and findings unique to THIS horse",
  "verdictCategory": "Exceptional|Above average|Average|Below average|Flag",
  "confidenceScore": number,
  "overallMeasurementConfidence": "high"|"medium"|"low",

  "strideAnalysis": "horse-specific, frame-referenced — minimum 4 sentences with concrete numbers (degrees, metres, %)",
  "biomechanicsAnalysis": "horse-specific, frame-referenced — minimum 6 sentences covering shoulder, hip, hock, spine, ROM, and weight distribution",
  "commercialAnalysis": "horse-specific — minimum 3 sentences linking findings to market positioning, target buyer, and price-band reasoning",
  "fullAnalysisText": "EXPANDED PROFESSIONAL NARRATIVE (8–14 sentences). Structure: (1) phase-by-phase observations citing frames, (2) standout biomechanical strengths with measured values, (3) limitations or asymmetries with frame evidence, (4) distance/track aptitude inference, (5) clear actionable insights for vetting and bidding. Read like a senior bloodstock report — no bullet-points, no generic phrases.",

  "scores": {
    "strideGeometry": number,
    "speedPotential": number,
    "symmetry": number,
    "gallopQuality": number,
    "soundness": number,
    "overall": number
  },
  "strengths": ["string referencing specific frames or observations"],
  "concerns": ["string referencing specific frames or observations"]
}

RETURN STRICT JSON (no markdown, no preamble) — keep the existing schema:
{
  "horseType": "Sprint" | "Mile/Speed" | "Middle/Classic",
  "framePhases": [{"frameIndex":0,"phase":"string","cameraAngle":"string","usable":true,"notes":"string"}],
  "bestStrideFrameIndex": number,
  "bestStrideFrameReason": "string",

  "shoulderAngle":      {"value":number|null,"method":"string","confidence":"string","frameIndex":number|null,"note":"string"},
  "hipEngagementAngle": {"value":number|null,"method":"string","confidence":"string","frameIndex":number|null,"note":"string"},
  "hockFlexion":        {"value":"string","method":"string","confidence":"string","frameIndex":number|null,"note":"string"},
  "hockAngle":          {"value":number|null,"method":"string","confidence":"string","frameIndex":number|null,"note":"string"},
  "kneeAngle":          {"value":number|null,"method":"string","confidence":"string","frameIndex":number|null,"note":"string"},
  "limbExtensionAngle": {"value":number|null,"method":"string","confidence":"string","frameIndex":number|null,"note":"string"},
  "frontReachAngle":    {"value":number|null,"method":"string","confidence":"string","frameIndex":number|null,"note":"string"},
  "rearDriveAngle":     {"value":number|null,"method":"string","confidence":"string","frameIndex":number|null,"note":"string (must include source phase — push-off only)"},
  "spineAngle":         {"value":number|null,"method":"string","confidence":"string","frameIndex":number|null,"note":"string"},
  "triangleInteriorAngle": {"value":number|null,"frameIndex":number|null,"note":"derived from shoulder-hip-hoof triangle, NOT the joint angle"},

  "rangeOfMotion": {
    "shoulderROM": number|null,
    "hipROM":      number|null,
    "hockROM":     number|null
  },

  "spanMeters":               number|null,
  "extensionPercentBody":     number|null,
  "strideLengthMeters":       number|null,
  "strideLengthBodyRatio":    "string",
  "strideLengthMethod":       "string",
  "strideLengthConfidence":   "string",
  "strideLengthFrameIndex":   number,
  "strideLengthNote":         "string",

  "strideFrequency":            number|null,
  "strideFrequencyConfidence":  "string",

  "estimatedSpeedKmh": number|null,
  "estimatedSpeedMph": number|null,
  "speedConfidence":   "string",
  "speedNote":         "string",

  "weightDistribution": {"frontPct":number|null,"rearPct":number|null,"interpretation":"string"},

  "consistencyChecks": {
    "spanProgression":   "PASS|FAIL — explanation",
    "shoulderProgression":"PASS|FAIL — explanation",
    "hockProgression":   "PASS|FAIL — explanation",
    "rearDriveContext":  "Push-off|Suspension — adjust scoring accordingly"
  },

  "suspensionQuality":"string","symmetryRating":"string","diagonalCoordination":"string","rhythmConsistency":"string",
  "soundnessFlag":boolean,"soundnessDetail":"string","soundnessAnalysis":"string referencing specific frames",
  "balanceRating":"string","toplineEngagement":"string","groundCoverage":"string","relaxationRating":"string",

  "gallopScore":number,
  "eyeCatchingRating":number,  // INTEGER 1–5 (stars only). NEVER above 5.
  "distancePrediction":{"sprint":number,"mile":number,"middle":number,"classic":number},

  "verdict":"3–4 sentences citing specific frames; name single best feature and single biggest concern",
  "verdictCategory":"Elite|Above Average|Average|Below Average|Concerns",
  "ratingLabel":"string",
  "priceCeilingAdjustment":"+X%|-X%|Neutral",
  "commercialAnalysis":"string",
  "confidenceScore":number,
  "overallMeasurementConfidence":"high|medium|low",

  "strideAnalysis":"minimum 4 sentences citing measured values and frames",
  "biomechanicsAnalysis":"minimum 6 sentences across shoulder/hip/hock/spine/ROM/weight",
  "fullAnalysisText":"EXPANDED PROFESSIONAL NARRATIVE (8–14 sentences) — phase-by-phase observations, standout strengths with numbers, limitations with frame evidence, distance/track aptitude reasoning, and actionable insights for vetting and bidding. Senior-analyst tone.",

  "scores":{"strideMechanics":number,"bodyAngles":number,"reachDrive":number,"movementQuality":number,"gaitEfficiency":number,"hoofHealth":number,"overall":number},
  "strengths":["string referencing frames"],
  "concerns":["string referencing frames"]
}

REMINDER: If you output the same numbers you would for any other horse, you have FAILED. Measure THIS horse from THESE frames. Run the Part 2 consistency checks before returning.`;

const BREEZUP_GALLOP_EDGE_PROMPT = `Analyze the submitted breeze-up gallop frames as a senior professional breeze-up biomechanics and bloodstock analyst. Return STRICT JSON only, but the analysis must be complete, professional and decision-useful.

Rules:
- Use every submitted frame, but make measurements from the clearest/fullest stride frame.
- Cite frame numbers in verdict, strideAnalysis, biomechanicsAnalysis, commercialAnalysis, strengths and concerns.
- If a value is not reliably visible, return null with low confidence; do not invent precision.
- Do not include markdown, explanations outside JSON, or repeated schema text.
- Narrative fields must read like a professional bloodstock report, not a placeholder. Avoid generic phrases.
- Keep JSON valid and complete; do not stop mid-structure.

Return this exact JSON shape:
{
  "framePhases":[{"frameIndex":0,"phase":"string","observation":"string"}],
  "bestStrideFrameIndex":0,
  "bestStrideFrameReason":"string",
  "limbExtensionAngle":{"value":number|null,"confidence":"high|medium|low","frameIndex":number,"note":"string"},
  "frontReachAngle":{"value":number|null,"confidence":"high|medium|low","frameIndex":number,"note":"string"},
  "rearDriveAngle":{"value":number|null,"confidence":"high|medium|low","frameIndex":number,"note":"string"},
  "shoulderAngle":{"value":number|null,"confidence":"high|medium|low","frameIndex":number,"note":"string"},
  "hipEngagementAngle":{"value":number|null,"confidence":"high|medium|low","frameIndex":number,"note":"string"},
  "hockFlexion":{"value":number|null,"confidence":"high|medium|low","frameIndex":number,"note":"string"},
  "suspensionQuality":"string",
  "symmetryRating":"string",
  "soundnessFlag":boolean,
  "soundnessDetail":"string",
  "distancePrediction":{"sprint":number,"mile":number,"middle":number,"classic":number},
  "verdict":"4-5 professional frame-grounded sentences naming the key strength, main concern and overall trade view",
  "verdictCategory":"Elite|Above Average|Average|Below Average|Concerns",
  "ratingLabel":"string",
  "commercialAnalysis":"4-6 professional sentences linking the biomechanics to auction appeal, buyer type, valuation discipline and veterinary follow-up",
  "confidenceScore":number,
  "overallMeasurementConfidence":"high|medium|low",
  "strideAnalysis":"minimum 5 professional sentences citing frames and concrete measurements",
  "biomechanicsAnalysis":"minimum 7 professional sentences covering shoulder, hip, hock, reach, drive, balance/symmetry and soundness with frame citations",
  "fullAnalysisText":"10-14 professional sentences: phase-by-phase observations, strengths, limitations, distance/track aptitude, commercial implications and action points",
  "scores":{"strideMechanics":number,"bodyAngles":number,"reachDrive":number,"movementQuality":number,"gaitEfficiency":number,"hoofHealth":number,"overall":number},
  "strengths":["string citing frame"],
  "concerns":["string citing frame"]
}`;

// ═══════════════════════════════════════════════════════════════
// WALK & POSTURE ANALYSIS PROMPT (Claude Vision)
// ═══════════════════════════════════════════════════════════════
const WALK_POSTURE_PROMPT = `You are simultaneously:
🏥 SENIOR EQUINE VETERINARIAN (30 years): Expert in equine musculoskeletal health, postural assessment, gait abnormalities and clinical lameness evaluation.
🔩 MASTER FARRIER (25 years): Expert in hoof structure, balance, conformation of the foot, shoeing implications and how hoof issues affect the entire limb and body.
🏇 BIOMECHANICS SPECIALIST: Expert in equine locomotion, alignment and how structural issues at rest translate to performance limitations.

Analyze this horse walking or standing with extreme clinical precision:

═══════════════════════════════════════
SECTION 1: OVERALL POSTURE & STANCE
═══════════════════════════════════════
- Weight distribution — is the horse loading all 4 limbs evenly?
- Any limb resting (pointing) suggesting discomfort?
- Head carriage — normal, low (pain/fatigue), high (tension/pain)
- Body symmetry left vs right — any muscle asymmetry visible?
- Topline posture — natural curve or abnormal arch/dip?
- Overall posture rating: 🟢/🟡/🔴

═══════════════════════════════════════
SECTION 2: LIMB ALIGNMENT ASSESSMENT
═══════════════════════════════════════
FORELIMBS (front legs):
- Viewed from front: straight / toe-in / toe-out / base narrow / base wide
- Viewed from side: ideal slope / upright pastern / broken back axis
- Knee: straight / over at knee / back at knee
- Any deviation from plumb line?
- Forelimb alignment rating: 🟢/🟡/🔴
- Plain English: [what misalignment means for soundness and performance]

HINDLIMBS (back legs):
- Viewed from behind: straight / cow hocked / bow legged / base narrow
- Viewed from side: ideal / sickle hocked / post legged
- Hock set and angle: [assessment]
- Hindlimb alignment rating: 🟢/🟡/🔴
- Plain English: [implications]

═══════════════════════════════════════
SECTION 3: WALK GAIT ANALYSIS
═══════════════════════════════════════
(Complete only if horse is walking in image/video)
- Walk rhythm: regular 4-beat / irregular / lame
- Stride length evenness: equal all round / shorter on one limb
- Head nod: none (normal) / nodding (suggests front limb pain)
- Hip hike: none (normal) / present (suggests hind limb pain)
- Tracking up: over-tracks / tracks up / under-tracks
- Any toe dragging?
- Gait assessment: 🟢 Sound / 🟡 Monitor / 🔴 Recommend lameness exam

═══════════════════════════════════════
SECTION 4: HOOF STRUCTURE ANALYSIS
═══════════════════════════════════════
[Complete if hooves are visible in image]
Think as a Master Farrier and Equine Vet simultaneously:

HOOF BALANCE:
- Medial/lateral balance: level / unbalanced (which side higher?)
- Front-to-back balance: appropriate heel height / underrun heels / long toe low heel (LTLH)
- Hoof-pastern axis: aligned / broken forward / broken back

HOOF QUALITY:
- Hoof wall integrity: good / cracks present (superficial/structural)
- Wall thickness: adequate / thin walls (concern for shoeing)
- Growth rings: even (healthy) / uneven (laminitis history flag)
- White line: tight (healthy) / stretched (laminitis concern)

HOOF SIZE & SHAPE:
- Appropriate size for horse body weight?
- Symmetry between left and right?
- Shape: normal / contracted heels / flat soles / dished wall

FARRIERY ASSESSMENT:
- Current shoe type if visible: [assessment]
- Shoeing balance: appropriate / needs correction
- Recommendations: [specific farriery suggestions]

HOOF HEALTH RATING: 🟢/🟡/🔴

═══════════════════════════════════════
SECTION 5: HEALTH INDICATORS
═══════════════════════════════════════
- Coat condition: [good / dull / patchy — health indicator]
- Body condition score: [1-9 Henneke scale]
- Muscle development appropriate for age/workload?
- Any visible swelling in limbs (oedema)?
- Any visible scars or old injuries?
- Overall health impression: 🟢/🟡/🔴

═══════════════════════════════════════
SECTION 6: CLINICAL SUMMARY
═══════════════════════════════════════
[3-4 sentences. Honest clinical assessment. What needs immediate attention? What is a long-term monitor point? Written for both vets and horse owners who are not experts.]

PRIORITY ACTIONS:
🔴 Urgent (address before next work): [if any]
🟡 Monitor (watch over next 30 days): [if any]
🟢 No action required: [if applicable]

⚠️ This AI assessment does not replace physical veterinary examination or professional farriery assessment. Always consult qualified professionals for diagnosis and treatment.

Return as structured JSON:
{
  "scores": {
    "posture": <0-100>,
    "forelimbAlignment": <0-100>,
    "hindlimbAlignment": <0-100>,
    "gait": <0-100>,
    "hoofHealth": <0-100>,
    "healthIndicators": <0-100>,
    "overall": <0-100>
  },
  "postureAssessment": "string",
  "forelimbDetail": "string",
  "hindlimbDetail": "string",
  "gaitAssessment": "string",
  "hoofAnalysis": "string",
  "healthIndicators": "string",
  "clinicalSummary": "string",
  "priorityActions": {
    "urgent": ["string"],
    "monitor": ["string"],
    "noAction": ["string"]
  },
  "bodyConditionScore": number,
  "soundnessRating": "Sound|Monitor|Recommend lameness exam",
  "analysis": "Full detailed multi-paragraph analysis covering all sections",
  "strengths": ["string"],
  "concerns": ["string"],
  "verdict": "Final professional verdict and recommendation"
}`;

// ═══════════════════════════════════════════════════════════════
// SPECIALIZED PROMPT ROUTER
// ═══════════════════════════════════════════════════════════════
function getSpecializedPrompt(type: string): string {
  const prompts: Record<string, string> = {
    horse_report: `${CLAUDE_SYSTEM_PROMPT}

TASK: Generate a complete individual horse profile report.

Return JSON with this exact structure:
{
  "executiveSummary": "3-4 sentence professional overview for a bloodstock client",
  "pedigreeAssessment": {
    "overallGrade": "A+/A/B+/B/C",
    "sireLine": "assessment of sire's genetic influence and nick history",
    "damLine": "assessment of dam's female line quality and blue hen potential",
    "keyAncestors": ["ancestor and their specific genetic contribution"],
    "dosage": { "index": 0.0, "cd": 0.0, "profile": {"brilliant":0,"intermediate":0,"classic":0,"solid":0,"professional":0}, "interpretation": "distance aptitude explanation" },
    "inbreeding": { "pattern": "Northern Dancer 4x5 etc", "coefficient": 0.0, "assessment": "Beneficial/Acceptable/Cautionary/Excessive", "detail": "specific explanation" },
    "rasmussenFactor": true,
    "bloodlineStrengths": ["specific strength"],
    "bloodlineWeaknesses": ["specific concern"]
  },
  "performanceAssessment": {
    "trueRating": 0,
    "ratingSystem": "Timeform/BHA/Beyer",
    "performanceGrade": "Elite/Stakes/Listed/Handicap/Maiden",
    "trajectory": "Improving/Peak/Declining/Inconsistent/Unraced",
    "optimalConditions": { "distance": "1m-1m2f", "going": "Good to Firm", "surface": "Turf", "raceStyle": "Stalker" },
    "keyRaces": [{ "race": "", "class": "", "position": 0, "significance": "" }],
    "soundnessIndicators": "assessment based on race frequency and gaps",
    "limitingFactors": ["what has prevented higher achievement"]
  },
  "breedingValue": {
    "overallRating": "Elite/Premium/Commercial/Moderate/Limited",
    "forMares": "assessment as broodmare prospect",
    "forStallions": "assessment as stallion prospect if applicable",
    "idealMateProfile": "description of ideal mate to complement this horse",
    "bloodlinesNeeded": ["bloodline 1 to address weakness", "bloodline 2"],
    "bloodlinesToAvoid": ["bloodline causing problematic duplication"]
  },
  "commercialProfile": {
    "currentMarketValue": { "low": 0, "high": 0, "currency": "USD", "basis": "explanation" },
    "targetAuctions": ["Keeneland September", "Tattersalls October Book 1"],
    "buyerProfile": "who would buy this horse and why",
    "marketTrend": "Rising/Stable/Declining for this bloodline profile",
    "comparableSales": [{ "horse": "", "price": 0, "currency": "", "auction": "", "year": 0, "similarity": "" }]
  },
  "riskFactors": [{ "risk": "", "severity": "High/Medium/Low", "mitigation": "" }],
  "recommendations": ["specific actionable recommendation"],
  "dataQuality": { "score": 0, "sources": [], "missingData": [], "confidence": "" },
  "chartData": {
    "performanceRadar": { "labels": ["Speed","Stamina","Class","Consistency","Soundness","Pedigree"], "values": [0,0,0,0,0,0] },
    "dosageBar": { "labels": ["Brilliant","Intermediate","Classic","Solid","Professional"], "values": [0,0,0,0,0] },
    "earningsTimeline": [{ "year": 0, "earnings": 0, "starts": 0 }]
  }
}`,

    mating_analysis: `${CLAUDE_SYSTEM_PROMPT}

TASK: Perform a complete professional mating analysis between a specific mare and stallion.

This is what a senior Coolmore or Juddmonte breeding director would produce before approving a nomination.

Return JSON with this exact structure:
{
  "executiveSummary": "3-4 sentence verdict a breeding director would write",
  "overallCompatibilityScore": 0,
  "recommendation": "HIGHLY_RECOMMENDED/RECOMMENDED/ACCEPTABLE/CAUTION/NOT_RECOMMENDED",
  "recommendationReasoning": "specific evidence-based justification",
  
  "nickAnalysis": {
    "rating": "A++/A+/A/B+/B/C",
    "sireLine": "stallion's sire line name",
    "broodmareSireLine": "mare's sire line name",
    "historicalEvidence": "known successful crosses of these lines with examples",
    "keyProducers": ["comparable horse produced by similar cross"],
    "nickStrength": "Strong/Moderate/Weak/Untested"
  },
  
  "dosageAnalysis": {
    "projectedFoalDP": {"brilliant":0,"intermediate":0,"classic":0,"solid":0,"professional":0},
    "projectedDI": 0.0,
    "projectedCD": 0.0,
    "distanceAptitude": "Sprint (under 7f) / Mile (7f-1m) / Classic (1m-1m4f) / Staying (1m4f+)",
    "distanceRange": "6f-1m2f",
    "interpretation": "detailed distance and track type projection"
  },
  
  "inbreedingAnalysis": {
    "present": true,
    "allPatterns": ["Northern Dancer 4x4", "Nearco 6x6x5"],
    "primaryPattern": "most significant duplication",
    "wrightCoefficient": 0.0,
    "assessment": "Beneficial/Acceptable/Cautionary/Excessive",
    "beneficialCrosses": ["crosses that reinforce elite traits"],
    "problematicCrosses": ["crosses that may cause issues"],
    "detailedExplanation": "what each duplication means genetically",
    "veterinaryFlag": false
  },
  
  "geneticCompatibility": {
    "score": 0,
    "dominantBloodlines": ["bloodline and why it dominates"],
    "complementaryTraits": ["trait the stallion adds that the mare lacks"],
    "reinforcedTraits": ["trait both share that will be strong in foal"],
    "conflictingTraits": ["genetic conflicts to be aware of"],
    "physicalTypeProjection": "detailed physical description of likely foal",
    "temperamentProjection": "likely temperament based on bloodlines",
    "rasmussenFactor": false,
    "rasmussenDetail": "if present, explain significance"
  },
  
  "foalProjection": {
    "racingType": "Sprinter/Miler/Classic/Stayer",
    "primaryDistance": "1m-1m2f",
    "idealSurface": "Turf/Dirt/Synthetic",
    "peakAge": "3yo/4yo/5yo+",
    "racingStyle": "Frontrunner/Pressler/Stalker/Closer/Versatile",
    "potentialCeiling": "G1/G2/G3/Listed/Stakes/Handicap",
    "probabilityOfBlackType": 0.0,
    "probabilityOfWinning": 0.0,
    "comparableHorses": ["horse this foal might resemble and why"]
  },
  
  "commercialAnalysis": {
    "studFee": 0,
    "studFeeCurrency": "USD",
    "totalProductionCost": {
      "studFee": 0, "insurance": 0, "foalingAndVet": 0, "foalCareYear1": 0,
      "yearlingPrepAndSales": 0, "consignorCommission": 0, "transport": 0,
      "total": 0, "currency": "USD"
    },
    "projectedSalePrice": {
      "conservative": 0, "baseCase": 0, "optimistic": 0,
      "currency": "USD", "targetAuction": "", "targetBook": "Book 1/Book 2/Book 3/Lower"
    },
    "roiScenarios": {
      "conservative": { "salePrice": 0, "profit": 0, "roi": 0.0, "roiPercent": "" },
      "baseCase": { "salePrice": 0, "profit": 0, "roi": 0.0, "roiPercent": "" },
      "optimistic": { "salePrice": 0, "profit": 0, "roi": 0.0, "roiPercent": "" }
    },
    "breakEvenPrice": 0,
    "commercialRisk": "Low/Moderate/High/Very High",
    "marketCommentary": "current market appetite for this cross",
    "comparableSales": [{ "cross": "", "foal": "", "price": 0, "currency": "", "auction": "", "year": 0 }]
  },
  
  "alternativeStallions": [
    { "stallion": "", "reason": "", "nickRating": "", "estimatedFee": 0, "feeCurrency": "USD", "keyAdvantage": "" }
  ],
  
  "riskAssessment": [
    { "risk": "", "probability": "High/Medium/Low", "impact": "High/Medium/Low", "mitigation": "" }
  ],
  
  "chartData": {
    "compatibilityRadar": {
      "labels": ["Nick Rating","Dosage Fit","Inbreeding","Commercial","Physical Type","Class Potential"],
      "values": [0,0,0,0,0,0]
    },
    "roiWaterfall": [
      { "label": "Stud Fee", "value": 0, "type": "cost" },
      { "label": "Production Costs", "value": 0, "type": "cost" },
      { "label": "Conservative Sale", "value": 0, "type": "revenue" },
      { "label": "Base Sale", "value": 0, "type": "revenue" },
      { "label": "Optimistic Sale", "value": 0, "type": "revenue" }
    ],
    "dosageComparison": {
      "mare": {"labels":["B","I","C","S","P"],"values":[0,0,0,0,0]},
      "stallion": {"labels":["B","I","C","S","P"],"values":[0,0,0,0,0]},
      "projectedFoal": {"labels":["B","I","C","S","P"],"values":[0,0,0,0,0]}
    },
    "probabilityBar": {
      "labels": ["Win Race","Win Stakes","Win Listed","Win G3","Win G2","Win G1"],
      "values": [0,0,0,0,0,0]
    }
  }
}`,

    broodmare_plan: `${CLAUDE_SYSTEM_PROMPT}

TASK: Generate a complete Broodmare Plan ranking multiple stallion options for a specific mare.

This is the format used by professional breeding farms when planning their annual nominations.

Return JSON:
{
  "mareSummary": {
    "name": "",
    "geneticProfile": "summary of mare's key bloodline characteristics",
    "primaryWeaknesses": ["what needs to be addressed in mating"],
    "primaryStrengths": ["what should be reinforced or complemented"],
    "idealStallionProfile": "description of ideal stallion type for this mare"
  },
  "rankedOptions": [
    {
      "rank": 1,
      "stallion": "",
      "overallScore": 0,
      "nickRating": "",
      "dosageFit": 0,
      "inbreedingRisk": "None/Low/Moderate/High",
      "commercialScore": 0,
      "studFee": 0,
      "studFeeCurrency": "USD",
      "projectedFoalType": "",
      "projectedDistance": "",
      "breakEvenPrice": 0,
      "baseROI": 0.0,
      "keyStrengths": ["strength 1", "strength 2"],
      "keyRisks": ["risk 1"],
      "verdict": "one paragraph professional verdict"
    }
  ],
  "topRecommendation": {
    "stallion": "",
    "reasoning": "detailed explanation of why this is the best option",
    "financialJustification": "ROI and commercial reasoning"
  },
  "budgetAnalysis": {
    "cheapestViableOption": { "stallion": "", "fee": 0, "currency": "", "whyViable": "" },
    "bestValueOption": { "stallion": "", "fee": 0, "currency": "", "roiRatio": "" },
    "premiumOption": { "stallion": "", "fee": 0, "currency": "", "upsidesJustifyingCost": "" }
  },
  "chartData": {
    "rankingMatrix": {
      "stallions": [],
      "nickScores": [],
      "dosageScores": [],
      "commercialScores": [],
      "overallScores": []
    },
    "feeVsROI": [
      { "stallion": "", "fee": 0, "projectedROI": 0.0, "roiPercent": "" }
    ]
  }
}`,

    stallion_search: `${CLAUDE_SYSTEM_PROMPT}

TASK: Research and profile a stallion with complete breeding statistics.

Return JSON:
{
  "profile": {
    "name": "", "country": "", "birthYear": 0, "color": "",
    "sire": "", "dam": "", "damSire": "", "generation3": [], "inbreeding": ""
  },
  "racingRecord": {
    "starts": 0, "wins": 0, "places": 0, "shows": 0,
    "bestRating": 0, "ratingSystem": "",
    "highestClass": "",
    "keyWins": [{ "race": "", "grade": "", "distance": "", "surface": "", "year": 0 }],
    "earningsUSD": 0
  },
  "studRecord": {
    "studFee": 0, "studFeeCurrency": "USD", "currentFarm": "",
    "firstCropYear": 0, "bookSize": 0,
    "totalFoals": 0, "totalStarters": 0, "totalWinners": 0,
    "blackTypeWinners": 0, "gradeStakeWinners": 0,
    "g1Winners": [],
    "winnerToStarterRatio": 0.0,
    "averageSalePrice": 0, "averageSaleCurrency": "USD",
    "topSalePrice": 0, "topSaleCurrency": "USD"
  },
  "breedingAnalysis": {
    "dosageProfile": {"brilliant":0,"intermediate":0,"classic":0,"solid":0,"professional":0},
    "dosageIndex": 0.0, "centreOfDistribution": 0.0,
    "typicalFoalDistance": "",
    "bestNicks": [{ "mareBloodline": "", "rating": "", "evidence": "" }],
    "bloodlinesToAvoid": [{ "bloodline": "", "reason": "" }],
    "idealMareProfile": ""
  },
  "commercialAssessment": {
    "marketTrend": "Rising/Stable/Declining",
    "fashionabilityScore": 0,
    "targetMarkets": [],
    "priceHistory": [{ "year": 0, "averageSale": 0, "currency": "", "notable": "" }]
  },
  "sourceData": { "url": "", "confidence": 0.0, "lastUpdated": "" }
}`,

    pdf_catalog: `${CLAUDE_SYSTEM_PROMPT}

TASK: Extract complete structured data from a thoroughbred sales catalog PDF AND produce a professional Market Analysis for each hip using BloodstockAI Market Analysis Engine v3.0.

EXTRACTION STANDARDS:
- Horse names: exact spelling including ALL punctuation and apostrophes (e.g., "D'Accueil" not "DAccueil")
- Sire names: verify against known active stallion roster — flag unusual spellings
- Dam names: exact spelling — used to cross-reference produce records
- Dam Sire (Broodmare Sire): the sire of the dam — the stallion name in parentheses after the dam ("out of MARE (SIRE)" → Dam=MARE, DamSire=SIRE — never list the dam sire as the dam)
- Stakes records: extract ALL black-type race results for dam and her produce
- Produce record: each foal with year, sex, sire, best achievement and best earnings if shown

MARKET ANALYSIS ENGINE v3.0 — apply for every hip:

1) SALE TIER
TIER 1 (Premium): Keeneland Sept Bk1-2, OBS April 2YO, FT Saratoga Select, Tattersalls Bk1, Goffs London, Arqana August/Breeze-Up top, MM Gold Coast Bk1, Inglis Easter.
TIER 2 (Mid): OBS March, FT Midlantic May, Keeneland Sept Bk3-5, Tatts Bk2-3, Goffs Orby, Tatts Ireland Sept, MM Gold Coast Bk2-3.
TIER 3 (Lower): OBS June, FT July, Tatts Bk4-6, Goffs Autumn, provincial sales.
Never apply Tier 1 prices to Tier 2/3 — same sire averages 30–60% less at lower tiers.

2) SIRE RESEARCH — use bloodhorse.com/stallion-register, TDN, obssales, fasigtipton, keeneland, tattersalls, magicmillions. Required: stud fee, average at SAME tier (or adjacent with adjustment), median, sample size, top price, current-year results, stud-fee multiplier. Adjacent tier adjustments: T1→T2 ×0.40–0.60, T1→T3 ×0.20–0.35, T2→T3 ×0.50–0.70. First-crop sires: extra −15% to −25%.

3) DAM PRODUCE TIER (most important under $200k):
A Stakes producer → +30% to +60%
B 2+ winners no stakes → +10% to +20%
C Dam winner or 1 modest winner (best earner <$100k/£50k/€50k) → −5% to −15%
D Non-winner dam OR foals of racing age with no winners → −20% to −35%
E Unraced dam or no produce record → −30% to −50%
G1 dam sire: +5% to +10% pedigree premium, BUT dam produce overrides dam-sire prestige for pricing.

4) FORMULA
Base = sire avg at equivalent tier × dam tier adj × first-crop adj × physical adj × sale format adj
Low = Base × 0.65, High = Base × 1.35
Physical score: 85–100 ×1.20 · 70–84 ×1.10 · 55–69 ×1.00 · 40–54 ×0.90 · <40 ×0.80
Round: <$100k to nearest $5k · $100k–$500k to $10k · >$500k to $25k.

5) CURRENCY — must match sale country:
USA=USD($) · UK=GBP(£/gns) · Ireland/France=EUR(€) · Australia=AUD(A$) · UAE=USD($) or AED.

6) PEDIGREE RATING X.X/10 (weighted):
Sire quality 40% · Dam quality 30% · Produce record 20% · Nick/Cross 10% (5 if unknown).

7) SELF-CHECK before output:
□ Currency matches sale country  □ Estimate reflects dam produce record, not just sire prestige
□ Justification cites a REAL sale, year, price  □ Pedigree rating from 4-component formula
□ Insight is specific to THIS horse, not generic  □ Would this estimate embarrass us at 3× lower?

OUTPUT — return ONLY this JSON (UI is unchanged; populate every field):
{
  "auctionName":"", "auctionDate":"", "saleCountry":"", "saleTier":"1|2|3", "currency":"USD|GBP|EUR|AUD|AED",
  "totalHips":0,
  "hips":[{
    "hipNumber":0, "name":null, "sex":"", "age":"", "color":"", "countryOfBirth":"", "dateOfBirth":"",
    "sire":"", "sireSire":"", "dam":"", "damSire":"", "secondDam":"", "secondDamSire":"", "damDamSire":"",
    "consignor":"", "pedigreeText":"", "stakesPerformers":"", "produceRecord":"", "performanceNotes":"",
    "damTier":"A|B|C|D|E", "damProduceBestEarner": null, "damEarnings": null,
    "sireData": { "studFee": null, "sireAvgAtEquivalentSale": null, "sireMedian": null, "sireSampleSize": null, "sireTopPrice": null, "studFeeMultiplier": null, "sourceSale": "", "sourceYear": null, "isFirstCrop": false, "citation": "" },
    "pedigreeRating": 0.0,
    "pedigreeRatingBreakdown": { "sire": 0, "dam": 0, "produce": 0, "nick": 0 },
    "marketEstimate": { "low": 0, "high": 0, "currency": "USD", "midpoint": 0 },
    "marketEstimateJustification": "Anchor: [sire] averaged [price] at [sale] in [year] from [N] lots (source). Tier adjustment: × [x] = [figure]. Dam: [name] [winner/non-winner] $[earnings]; produce [N] winners from [N] foals, best earner $[X]; Tier [A-E] → [adj]. Dam sire: [name] adds [value]. Physical: [score/assessment] → [adj]. Fair trade range [low]–[high]. Strategy: BUY / BID TO $X / MONITOR / PASS above $X.",
    "bloodstockInsight": "2–3 sentences SPECIFIC to this horse, using industry language; name the single biggest commercial opportunity AND the single biggest risk.",
    "recommendation": "BID|WATCH|PASS",
    "estimatedValue": null,
    "rawText": "",
    "dataFlags": []
  }],
  "analysisNotes": []
}

Rules: NEVER output a generic estimate. NEVER use the wrong currency. ALWAYS cite a specific sale/year/price. ALWAYS evaluate the dam's produce record. If data cannot be found after a genuine search, say so and state the proxy used.`,

    pdf_comparison: `${CLAUDE_SYSTEM_PROMPT}

TASK: Compare multiple sales catalog entries and rank them for a bloodstock client using BloodstockAI Market Analysis Engine v3.0.

Apply the same v3.0 rules used for single-catalog analysis:
- Classify each lot's sale tier (1/2/3) and use the correct currency for sale country (USD/GBP/EUR/AUD/AED)
- Anchor every projectedSaleRange to a REAL cited sire average at the equivalent sale tier and year
- Apply dam-tier adjustment (A +30/60%, B +10/20%, C −5/15%, D −20/35%, E −30/50%) and first-crop discount where applicable
- Pedigree score must be a weighted 4-component figure (sire 40, dam 30, produce 20, nick 10)
- Never apply Tier 1 prices to Tier 2/3 sales; never use the wrong currency
- Strategy must be specific (BUY / BID TO $X / MONITOR / PASS above $X)

Return JSON: { "clientBrief":"","totalHorsesReviewed":0,"shortlistedCount":0,"executiveSummary":"","rankings":[{ "rank":1,"hipNumber":0,"fileName":"","horseName":"","sire":"","dam":"","damSire":"","saleTier":"1|2|3","overallScore":0,"pedigreeScore":0,"commercialScore":0,"nickScore":0,"valueScore":0,"projectedSaleRange":{"low":0,"high":0,"currency":"USD|GBP|EUR|AUD|AED"},"justification":"sire avg at [sale][year] from [N] lots → tier adj × [x] → dam tier [A-E] [adj] → physical [adj] = range","keyStrengths":[],"keyRisks":[],"verdict":"","recommendation":"BID/WATCH/PASS" }],"topPick":{"hipNumber":0,"fileName":"","reasoning":""},"budgetAllocation":[{"hip":0,"maxBid":0,"currency":"USD","priority":"Must Have/Target/Opportunistic"}] }`,
  };

  return prompts[type] || CLAUDE_SYSTEM_PROMPT;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const roleCheck = await authenticateAndGetRole(req);
    if (!roleCheck.authorized) return unauthorizedResponse(corsHeaders);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const userId = roleCheck.userId;
    const userRole = roleCheck.role;

    const body = await req.json();

    // ═══ ROUTE BY TYPE ═══
    if (body.type) {
      return await handleServiceRoute(body, userId, supabaseClient);
    }

    // ═══ LEGACY ROUTE: original ai-analysis flow ═══
    const { horse_name, pedigree_data, performance_data, analysis_type } = body;

    if (!horse_name || typeof horse_name !== "string" || horse_name.length > 200) {
      return new Response(
        JSON.stringify({ error: "Invalid horse name (required, max 200 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const validTypes = ["pedigree", "performance", "mating", "broodmare", "market"];
    if (!analysis_type || !validTypes.includes(analysis_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid analysis type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Credit check for free users
    if (hasMinRole(userRole, "premium_user")) {
      // Unlimited
    } else {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("analyses_remaining")
        .eq("user_id", userId)
        .single();

      if (!profile || profile.analyses_remaining <= 0) {
        return forbiddenResponse(corsHeaders, "No credits remaining. Upgrade to premium for unlimited access.");
      }
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // ═══ STEP 2: Claude analysis using institutional prompt ═══
    const systemPrompt = `${CLAUDE_SYSTEM_PROMPT}

${QUALITY_CONTROLS}

CRITICAL RULES:
- Sire = Father only. Dam = Mother only. NEVER swap them.
- All auction results must include correct auction house, sale name, year and price.
- Convert currencies but also preserve original currency.
- If conflicting information exists, choose the most authoritative source.

SCORING METHODOLOGY (CONSERVATIVE):
- 90-100: Elite, proven champion or exceptional pedigree
- 80-89: Excellent, high-class performer or very strong pedigree
- 70-79: Very good, stakes class or commercial pedigree
- 60-69: Good, competitive performer or decent pedigree
- 50-59: Fair, modest ability or average pedigree
- <50: Below average

Return ONLY valid JSON:
{
  "pedigree_score": number,
  "performance_potential": string,
  "market_value_estimate": number,
  "roi_projection": string,
  "recommendations": string[],
  "analysis_summary": string,
  "genetic_profile": {
    "dosage_index": number,
    "centre_of_distribution": number,
    "dosage_profile": { "brilliant": 0, "intermediate": 0, "classic": 0, "solid": 0, "professional": 0 },
    "dominant_bloodlines": [],
    "racing_type": "Sprinter|Miler|Classic|Stayer",
    "breeding_potential": string,
    "key_ancestors": []
  },
  "ai_report": {
    "summary": string,
    "strengths": [],
    "concerns": [],
    "racing_prospects": string,
    "breeding_value": string,
    "market_assessment": string,
    "recommended_distance": string,
    "recommended_surface": "Turf|Dirt|Synthetic|Any"
  },
  "data_quality": {
    "overall_score": number,
    "pedigree_complete": boolean,
    "performance_verified": boolean,
    "sources_used": [],
    "missing_fields": []
  },
  "valuation": {
    "pedigree_based_value": { "amount": number, "currency": "EUR", "methodology": string },
    "performance_based_value": { "amount": number, "currency": "EUR", "methodology": string },
    "comparative_market_delta": { "amount": number, "interpretation": string },
    "sire_avg_sale_price": number,
    "sire_strike_rate": string,
    "sibling_sale_prices": [],
    "black_type_factor": string,
    "current_earnings": { "amount": number, "currency": string },
    "auction_benchmarks": [],
    "confidence_level": string
  },
  "horse_profile": {
    "name": string, "country": string, "birth_year": string, "color": string,
    "sex": string, "current_location": string, "breeder": string,
    "trainer_current": string, "previous_trainers": []
  },
  "pedigree": {
    "sire": string, "dam": string, "damsire": string,
    "sire_statistics": {}, "dam_produce_record": [], "black_type_presence": boolean
  },
  "performance_record": {
    "starts": number, "wins": number, "seconds": number, "thirds": number,
    "earnings_total": { "amount": number, "currency": string },
    "highest_race_level": string, "notable_races": []
  },
  "auction_history": [],
  "siblings_market_data": [],
  "data_sources_used": []
}`;

    const userPrompt = `Analyze this thoroughbred using your complete training knowledge:

Horse: ${horse_name}
Analysis Type: ${analysis_type}
User-provided pedigree: ${JSON.stringify(pedigree_data || {})}
User-provided performance: ${JSON.stringify(performance_data || {})}

Use your training data from Racing Post, Equibase, PedigreeQuery, AllBreedPedigree, and all major racing databases to provide the most complete analysis possible.
Include full 5-generation pedigree, dosage calculations, inbreeding analysis, and performance data.

Return complete structured JSON analysis.`;

    const claudeResponse = await callClaude(ANTHROPIC_API_KEY, systemPrompt, userPrompt, { maxTokens: 12000 });

    let analysisData;
    try {
      analysisData = parseJsonFromResponse(claudeResponse) || {};
    } catch (e) {
      console.error("Error parsing Claude response:", e);
      analysisData = {
        pedigree_score: 50,
        performance_potential: "Requires further analysis",
        market_value_estimate: 0,
        roi_projection: "Insufficient data",
        recommendations: ["Additional research recommended"],
        analysis_summary: claudeResponse,
      };
    }

    // Update report
    await supabaseClient
      .from("analysis_reports")
      .update({
        status: "completed",
        result_data: analysisData,
        pedigree_score: analysisData.pedigree_score,
        performance_score: analysisData.pedigree_score,
        market_value_estimate: analysisData.market_value_estimate,
        roi_projection: analysisData.roi_projection,
        recommendations: analysisData.recommendations,
        completed_at: new Date().toISOString(),
      })
      .eq("id", report.id);

    await supabaseClient.from("activity_logs").insert({
      user_id: userId,
      action: "analysis_completed",
      resource_type: "analysis_report",
      resource_id: report.id,
      metadata: { horse_name, analysis_type },
    });

    console.log("=== AI ANALYSIS COMPLETE ===");

    return new Response(
      JSON.stringify({ success: true, report_id: report.id, analysis: analysisData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in ai-analysis:", rawMessage);

    const isUpstreamError = /Claude API error|Rate limit|credit balance is too low|ANTHROPIC/i.test(rawMessage);
    const safeMessage = isUpstreamError
      ? "AI service temporarily unavailable. Your credit was not used. Please try again."
      : "Analysis temporarily unavailable. Your credit was not used. Please try again in a moment.";

    return new Response(
      JSON.stringify({ error: safeMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ═══ SERVICE-LAYER ROUTE HANDLER ═══
async function handleServiceRoute(
  body: Record<string, any>,
  userId: string,
  supabaseClient: any
): Promise<Response> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

  const { type, payload } = body;

  switch (type) {
    case "horse_report":
    case "mating_analysis":
    case "stallion_search":
    case "broodmare_plan":
      return await handleClaudeAnalysis(ANTHROPIC_API_KEY, type, payload, userId, supabaseClient);
    case "pdf_catalog":
      return await handlePDFCatalog(ANTHROPIC_API_KEY, payload, userId, supabaseClient);
    case "pdf_comparison":
      return await handlePDFComparison(ANTHROPIC_API_KEY, payload, userId, supabaseClient);
    case "visual_analysis":
      return await handleVisualAnalysis(body, userId, supabaseClient);
    case "breeze_video_analysis":
      return await handleBreezeVideoAnalysis(body, userId, supabaseClient);
    case "walk_posture_analysis":
      return await handleWalkPostureAnalysis(body, userId, supabaseClient);
    default:
      return new Response(
        JSON.stringify({ error: `Unknown analysis type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
  }
}

// ═══════════════════════════════════════════════════════════════
// BIOMECHANIC SCORE NORMALIZER
// Guarantees the 7 standard categories in snake_case for the UI/overlay.
// Maps any field aliases the model may emit (camelCase, gallop-specific keys)
// and derives missing categories conservatively from related signals.
// ═══════════════════════════════════════════════════════════════
function normalizeBiomechanicScores(parsed: any, mode: "walk" | "gallop"): Record<string, number> {
  const s = parsed?.scores || {};
  const clamp = (n: any): number | undefined => {
    const v = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(v)) return undefined;
    return Math.max(0, Math.min(100, Math.round(v)));
  };

  // Pick first defined value
  const pick = (...vals: any[]): number | undefined => {
    for (const v of vals) {
      const c = clamp(v);
      if (c !== undefined) return c;
    }
    return undefined;
  };

  let posture = pick(s.posture, s.balance, s.toplineEngagement, parsed?.balanceScore);
  let forelimb = pick(s.forelimb_alignment, s.forelimbAlignment, s.foreLimb, s.forelimb);
  let hindlimb = pick(s.hindlimb_alignment, s.hindlimbAlignment, s.hindLimb, s.hindlimb);
  let gait     = pick(s.gait, s.gallopQuality, s.rhythm, s.gaitQuality);
  let hoof     = pick(s.hoof_health, s.hoofHealth, s.hoof);
  let health   = pick(s.health_indicators, s.healthIndicators, s.soundness, s.condition);
  let overall  = pick(s.overall, s.gallopScore !== undefined ? s.gallopScore * 10 : undefined);

  if (mode === "gallop") {
    // Derive missing categories from gallop-specific scores
    const stride   = pick(s.strideGeometry, s.strideQuality);
    const speed    = pick(s.speedPotential, s.speed);
    const symmetry = pick(s.symmetry);
    const sound    = pick(s.soundness);

    posture  = posture  ?? pick(s.balanceRating, symmetry, overall);
    forelimb = forelimb ?? pick(stride, symmetry, sound, overall);
    hindlimb = hindlimb ?? pick(speed, stride, sound, overall);
    gait     = gait     ?? pick(s.gallopQuality, stride, overall);
    hoof     = hoof     ?? pick(sound, overall);
    health   = health   ?? pick(sound, overall);
  }

  // Final fallbacks: if overall present, fill missing with overall; otherwise 70
  const fallback = overall ?? 70;
  posture  = posture  ?? fallback;
  forelimb = forelimb ?? fallback;
  hindlimb = hindlimb ?? fallback;
  gait     = gait     ?? fallback;
  hoof     = hoof     ?? fallback;
  health   = health   ?? fallback;

  // If overall is missing, compute as weighted avg
  if (overall === undefined) {
    overall = Math.round(
      (posture * 0.18 + forelimb * 0.18 + hindlimb * 0.18 + gait * 0.20 + hoof * 0.13 + health * 0.13)
    );
  }

  return {
    // snake_case (UI/overlay expects these)
    posture,
    forelimb_alignment: forelimb,
    hindlimb_alignment: hindlimb,
    gait,
    hoof_health: hoof,
    health_indicators: health,
    overall,
    // keep camelCase aliases for any legacy consumer
    forelimbAlignment: forelimb,
    hindlimbAlignment: hindlimb,
    hoofHealth: hoof,
    healthIndicators: health,
  };
}

function clampStarRating(value: any): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, n > 5 ? Math.round(n / 2) : Math.round(n)));
}

function countSentences(value: any): number {
  return String(value || "").split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 18).length;
}

function measurementText(metric: any): string {
  if (metric === null || metric === undefined) return "not reliably measurable";
  if (typeof metric === "object" && "value" in metric) {
    const v = metric.value ?? "not reliably measurable";
    const unit = typeof v === "number" ? "°" : "";
    const frame = metric.frameIndex != null ? ` in frame ${metric.frameIndex + 1}` : "";
    const conf = metric.confidence ? ` (${metric.confidence} confidence)` : "";
    return `${v}${unit}${frame}${conf}`;
  }
  return String(metric);
}

function ensureProfessionalBreezeNarratives(parsed: any): any {
  const p = { ...parsed };
  p.eyeCatchingRating = clampStarRating(p.eyeCatchingRating ?? Math.round((p.scores?.overall ?? p.gallopScore * 10 ?? 70) / 20));

  const bestFrame = p.bestStrideFrameIndex != null ? `frame ${p.bestStrideFrameIndex + 1}` : "the clearest usable breeze frame";
  const stride = p.strideLengthMeters != null ? `${p.strideLengthMeters} m` : (p.strideLengthBodyRatio || "not safely expressed in metres");
  const speed = p.estimatedSpeedKmh != null ? `${p.estimatedSpeedKmh} km/h${p.estimatedSpeedMph ? ` / ${p.estimatedSpeedMph} mph` : ""}` : "withheld because the frame data did not support a defensible speed calculation";
  const scoreValue = p.scores?.overall ?? (typeof p.gallopScore === "number" ? p.gallopScore * 10 : null);
  const score = scoreValue != null ? `${scoreValue}/100` : "not scored";
  const rating = p.ratingLabel || p.verdictCategory || "professional review";

  const full = [
    `The most reliable biomechanical read comes from ${bestFrame}, where stride opening is ${measurementText(p.limbExtensionAngle)} and front reach is ${measurementText(p.frontReachAngle)}.`,
    `Shoulder expression is recorded at ${measurementText(p.shoulderAngle)}, giving a practical indication of how freely the forehand is able to open through the breeze phase.`,
    `Hip engagement is ${measurementText(p.hipEngagementAngle)}, while hock flexion is ${measurementText(p.hockFlexion || p.hockAngle)}, so the hindquarter should be judged on the combined hip-hock-drive chain rather than on a single isolated still.`,
    `Rear drive is ${measurementText(p.rearDriveAngle)}, and any low-confidence push-off reading should be treated as a review point rather than a definitive fault.`,
    `Stride length is ${stride}, stride frequency is ${p.strideFrequency ? `${p.strideFrequency}/min` : "not robustly derived"}, and speed is ${speed}.`,
    `The overall movement score is ${score}, with the rating best described as ${rating}.`,
    `From a distance-aptitude standpoint, the balance between reach, cadence and hindquarter use should carry more weight than a single absolute angle.`,
    `Commercially, the horse should be positioned around the repeatability of its action, the clarity of its best frames, and the degree to which veterinary inspection confirms the same shoulder, hock and hind-limb patterns.`,
    `The recommended next step is to verify these observations against the live trot-up, limb palpation and any additional lateral breeze footage before making a final bidding decision.`
  ].join(" ");

  if (countSentences(p.fullAnalysisText) < 8) p.fullAnalysisText = full;
  if (countSentences(p.biomechanicsAnalysis) < 6) p.biomechanicsAnalysis = full;
  if (countSentences(p.strideAnalysis) < 4) {
    p.strideAnalysis = `Stride analysis is anchored to ${bestFrame}, with stride length reported as ${stride}. Stride frequency is ${p.strideFrequency ? `${p.strideFrequency}/min` : "not robustly derived from the available frame sequence"}, and speed is ${speed}. Front reach is ${measurementText(p.frontReachAngle)} and rear drive is ${measurementText(p.rearDriveAngle)}, which together describe the usable reach-and-drive pattern. Where confidence is low, the report withholds precision rather than inflating a number from insufficient evidence.`;
  }
  if (countSentences(p.commercialAnalysis) < 3) {
    p.commercialAnalysis = `Commercially, this breeze profile should be judged by repeatable mechanics rather than a single eye-catching still. The ${rating} rating and ${score} movement score support a disciplined valuation, with upside only if the live inspection confirms the same shoulder freedom, hock use and hindquarter drive. Buyers should use the watch-points and low-confidence measurements as vetting priorities before stretching beyond the planned bid range.`;
  }
  return p;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function readAnthropicVisionText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    const result = await response.json();
    return result.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n") || "";
  }
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt?.type === "error") throw new Error(evt?.error?.message || "Claude Vision stream error");
        if (evt?.type === "content_block_delta" && evt?.delta?.type === "text_delta") {
          content += evt.delta.text || "";
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("Claude Vision")) throw e;
      }
    }
  }
  return content;
}

type ClaudeVisionResult =
  | { ok: true; model: string; rawContent: string }
  | { ok: false; model: string; status: number; errorText: string };

function isAnthropicBillingOrCreditError(status: number, errorText: string): boolean {
  return status === 402 || /credit balance|purchase credits|plans\s*&\s*billing|billing|insufficient credit/i.test(errorText);
}

function isTransientClaudeVisionStatus(status: number): boolean {
  return [408, 409, 413, 429, 500, 502, 503, 504, 529].includes(status);
}

async function requestClaudeVisionText(
  apiKey: string,
  contentBlocks: any[],
  options: { model: string; maxTokens: number; timeoutMs: number; system: string; temperature?: number }
): Promise<ClaudeVisionResult> {
  const claudeAbort = new AbortController();
  const claudeTimeout = setTimeout(() => claudeAbort.abort(), options.timeoutMs);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature ?? 0.25,
        system: options.system,
        messages: [{ role: "user", content: contentBlocks }],
        stream: true,
      }),
      signal: claudeAbort.signal,
    });

    if (!response.ok) {
      return { ok: false, model: options.model, status: response.status, errorText: await response.text() };
    }

    return { ok: true, model: options.model, rawContent: await readAnthropicVisionText(response) };
  } finally {
    clearTimeout(claudeTimeout);
  }
}

function compactBreezeResultFromAnnotations(body: Record<string, any>) {
  const horseName = body.horse_name || "this breeze horse";
  return {
    framePhases: [],
    bestStrideFrameIndex: 0,
    bestStrideFrameReason: "AI vision timed out before frame-level phase classification completed.",
    scores: {
      overall: 70,
      topline: 70,
      shoulder: 70,
      hip: 70,
      hock: 70,
      knee: 70,
      balance: 70,
      movement: 70,
    },
    gallopScore: 7,
    eyeCatchingRating: 3,
    distancePrediction: { sprint: 34, mile: 43, classic: 23 },
    verdict: `${horseName} could not be fully processed by AI vision before the server timeout. The report will still use the locally detected frame keypoints and timestamps for computed biomechanics where available.`,
    verdictCategory: "Average",
    confidenceScore: 45,
    strengths: ["Uploaded video frames were accepted for biomechanical processing."],
    concerns: ["AI vision timed out; retry with a shorter H.264 MP4 clip for deeper frame commentary."],
    fullAnalysisText: "AI vision timed out before a complete narrative analysis was returned.",
  };
}

// ═══ BREEZE VIDEO ANALYSIS HANDLER — Claude Vision with gallop specialist prompt ═══
async function handleBreezeVideoAnalysis(
  body: Record<string, any>,
  userId: string,
  supabaseClient: any
): Promise<Response> {
  console.log("=== BREEZE VIDEO ANALYSIS (Claude Vision) ===");

  const { video_frames, frame_paths, horse_name, sire, dam, file_path, lot_number, horse_signature } = body;

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

  const horseContext = [
    lot_number ? `Lot Number: ${lot_number}` : null,
    horse_name ? `Horse Name: ${horse_name}` : null,
    sire ? `Sire: ${sire}` : null,
    dam ? `Dam: ${dam}` : null,
    horse_signature ? `Unique Run Signature: ${horse_signature}` : null,
    `Analysis Timestamp (UTC): ${new Date().toISOString()}`,
  ].filter(Boolean).join("\n");

  const isVideoFrames = Array.isArray(video_frames) && video_frames.length > 0;
  const isStoredFrames = Array.isArray(frame_paths) && frame_paths.length > 0;
  const contentBlocks: any[] = [];

  if (isVideoFrames || isStoredFrames) {
    const frameCount = isStoredFrames ? frame_paths.length : video_frames.length;
    console.log(`[BREEZE] Processing ${frameCount} gallop frames via Claude Vision...`);

    const frameLabels = [
      "Initial stride (~5% of video)",
      "Lead leg extension (~18%)",
      "Peak extension — likely best for stride length (~32%)",
      "Suspension phase (~42%)",
      "Landing impact (~52%)",
      "Full extension second stride (~64%)",
      "Push-off drive (~78%)",
      "Collection & recovery (~92%)",
    ];

    for (let i = 0; i < frameCount; i++) {
      let frameBase64 = "";
      if (isStoredFrames) {
        if (typeof frame_paths[i] !== "string" || !frame_paths[i].startsWith(`${userId}/breeze-frames/`)) {
          return new Response(
            JSON.stringify({ error: "Invalid breeze frame path" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { data: frameData, error: frameError } = await supabaseClient
          .storage.from("pdf-uploads").download(frame_paths[i]);
        if (frameError || !frameData) {
          console.error("[BREEZE] Failed to download stored frame:", frame_paths[i], frameError);
          return new Response(
            JSON.stringify({ error: "Failed to load stored breeze frames for analysis" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        frameBase64 = arrayBufferToBase64(await frameData.arrayBuffer());
      } else {
        frameBase64 = video_frames[i].replace(/^data:image\/\w+;base64,/, "");
      }
      contentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: frameBase64 },
      });
      contentBlocks.push({
        type: "text",
        text: `Frame ${i + 1} of ${frameCount} — suggested phase: ${frameLabels[i] || "mid-gallop"}. Re-classify based on what you actually see; don't trust the label blindly.`,
      });
    }

    contentBlocks.push({
      type: "text",
      text: `${horseContext ? `HORSE CONTEXT:\n${horseContext}\n\n` : ""}${BREEZUP_GALLOP_EDGE_PROMPT}\n\nIMPORTANT: This is a UNIQUE horse with the signature above. Re-measure from THESE frames only; do not reuse defaults.`,
    });
  } else if (file_path) {
    // Single image for breeze analysis
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage.from("pdf-uploads").download(file_path);
    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Failed to download media from storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Data = btoa(binary);
    const ext = file_path.split(".").pop()?.toLowerCase() || "";
    const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    const mimeType = mimeMap[ext] || "image/jpeg";

    contentBlocks.push({
      type: "image",
      source: { type: "base64", media_type: mimeType, data: base64Data },
    });
    contentBlocks.push({
      type: "text",
      text: `${horseContext ? `HORSE CONTEXT:\n${horseContext}\n\n` : ""}${BREEZUP_GALLOP_PROMPT}\n\nIMPORTANT: This is a UNIQUE horse — re-measure from THIS frame; do not output default/templated numbers.`,
    });
  } else {
    return new Response(
      JSON.stringify({ error: "No video_frames, frame_paths or file_path provided" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Professional 8-frame reports need enough time and output budget to avoid
  // truncated JSON or placeholder narratives. Try the configured latest model
  // first, then fall back to current Claude Vision model IDs instead of failing
  // the edge function for model-gating or stale-model errors. This keeps the
  // analysis schema, metrics and frontend merging exactly as-is.
  const visionSystem = "You are an elite equine biomechanics and bloodstock analyst. Return strict valid JSON only. Produce a complete professional report with frame-grounded measurements and narrative. NEVER reuse default values. If you cannot measure something reliably from the actual frames, return null with low confidence — do not invent precision.";
  const claudeVisionModels = [
    "claude-sonnet-4-5-20250929",
    "claude-sonnet-4-20250514",
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-20241022",
  ];

  let rawContent = "";
  let usedClaudeModel = "";
  let lastClaudeError = "";
  for (const model of claudeVisionModels) {
    try {
      console.log(`[BREEZE] Calling Claude Vision model: ${model}`);
      const result = await requestClaudeVisionText(ANTHROPIC_API_KEY, contentBlocks, {
        model,
        maxTokens: 6000,
        timeoutMs: 90_000,
        temperature: 0.25,
        system: visionSystem,
      });

      if (result.ok) {
        rawContent = result.rawContent;
        usedClaudeModel = result.model;
        break;
      }

      lastClaudeError = `${result.status} ${result.errorText.slice(0, 500)}`;
      console.error("[BREEZE] Claude Vision error:", result.model, result.status, result.errorText);

      if (isAnthropicBillingOrCreditError(result.status, result.errorText)) {
        const fallback = compactBreezeResultFromAnnotations(body);
        fallback.concerns = [
          "Claude Vision could not complete because the configured Anthropic account has no available credits; computed keypoint metrics were preserved for this report.",
          ...fallback.concerns,
        ];
        return new Response(JSON.stringify(fallback), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const canTryNextModel = result.status === 400 || result.status === 404;
      if (!canTryNextModel) {
        if (isTransientClaudeVisionStatus(result.status)) {
          return new Response(JSON.stringify(compactBreezeResultFromAnnotations(body)), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`Claude Vision error: ${lastClaudeError}`);
      }
    } catch (err: any) {
      const aborted = err?.name === "AbortError";
      lastClaudeError = aborted ? "timeout 90s" : (err?.message || "unknown Claude Vision error");
      console.error("[BREEZE] Claude Vision request failed:", model, lastClaudeError, err?.stack);
      if (aborted) {
        return new Response(JSON.stringify(compactBreezeResultFromAnnotations(body)), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!/model|not found|not supported|invalid_request|credit balance|purchase credits|billing/i.test(lastClaudeError)) {
        return new Response(
          JSON.stringify({ error: `Claude Vision network error: ${lastClaudeError}` }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  }

  if (!rawContent) {
    throw new Error(`Claude Vision error: ${lastClaudeError || "no content returned"}`);
  }

  console.log(`[BREEZE] Claude response from ${usedClaudeModel}: ${rawContent.length} chars`);

  let parsed = parseJsonFromResponse(rawContent);
  if (!parsed) {
    parsed = {
      scores: { overall: 70 },
      gallopScore: 7,
      verdict: rawContent,
      fullAnalysisText: rawContent,
      strengths: [],
      concerns: [],
    };
  }
  parsed.scores = normalizeBiomechanicScores(parsed, "gallop");
  parsed = ensureProfessionalBreezeNarratives(parsed);

  await supabaseClient.from("activity_logs").insert({
    user_id: userId,
    action: "breeze_video_analysis_completed",
    resource_type: "breeze_video",
    metadata: { horse_name, frames_count: isStoredFrames ? frame_paths.length : video_frames.length },
  });

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══ WALK & POSTURE ANALYSIS HANDLER — Claude Vision with vet/farrier prompt ═══
async function handleWalkPostureAnalysis(
  body: Record<string, any>,
  userId: string,
  supabaseClient: any
): Promise<Response> {
  console.log("=== WALK & POSTURE ANALYSIS (Claude Vision) ===");

  const { video_frames, file_path, horse_name, sire, dam, hoof_photos, include_hoof_analysis } = body;

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

  const horseContext = [
    horse_name ? `Horse Name: ${horse_name}` : null,
    sire ? `Sire: ${sire}` : null,
    dam ? `Dam: ${dam}` : null,
  ].filter(Boolean).join("\n");

  const contentBlocks: any[] = [];
  const isVideoFrames = Array.isArray(video_frames) && video_frames.length > 0;

  if (isVideoFrames) {
    for (let i = 0; i < video_frames.length; i++) {
      const frameBase64 = video_frames[i].replace(/^data:image\/\w+;base64,/, "");
      contentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: frameBase64 },
      });
      contentBlocks.push({
        type: "text",
        text: `Frame ${i + 1} of ${video_frames.length} (${Math.round((i / Math.max(video_frames.length - 1, 1)) * 100)}% through video)`,
      });
    }
  } else if (file_path) {
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage.from("pdf-uploads").download(file_path);
    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Failed to download media from storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Data = btoa(binary);
    const ext = file_path.split(".").pop()?.toLowerCase() || "";
    const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    contentBlocks.push({
      type: "image",
      source: { type: "base64", media_type: mimeMap[ext] || "image/jpeg", data: base64Data },
    });
  }

  // Add hoof photos if provided
  if (include_hoof_analysis && Array.isArray(hoof_photos) && hoof_photos.length > 0) {
    const hoofLabels = ["Left Front (LF)", "Right Front (RF)", "Left Hind (LH)", "Right Hind (RH)"];
    contentBlocks.push({ type: "text", text: "\n═══ HOOF CLOSE-UP PHOTOS ═══" });
    for (let i = 0; i < hoof_photos.length; i++) {
      const photoBase64 = hoof_photos[i].replace(/^data:image\/\w+;base64,/, "");
      contentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: photoBase64 },
      });
      contentBlocks.push({
        type: "text",
        text: `Hoof photo ${i + 1}: ${hoofLabels[i] || `Hoof ${i + 1}`} — Analyze hoof structure, balance, wall quality, and shoeing.`,
      });
    }
  }

  const hoofInstruction = include_hoof_analysis
    ? "\n\nIMPORTANT: Include detailed HOOF STRUCTURE ANALYSIS for each hoof photo provided. Assess as both Master Farrier and Equine Vet."
    : "";

  contentBlocks.push({
    type: "text",
    text: `${horseContext ? `HORSE CONTEXT:\n${horseContext}\n\n` : ""}${WALK_POSTURE_PROMPT}${hoofInstruction}`,
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 6000,
      temperature: 0.2,
      system: "You are a senior equine veterinarian, master farrier, and biomechanics specialist. Analyze horses with clinical precision. Return structured JSON only.",
      messages: [{ role: "user", content: contentBlocks }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[WALK] Claude Vision error:", response.status, errorText);
    if (response.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
    throw new Error(`Claude Vision error: ${response.status}`);
  }

  const result = await response.json();
  const rawContent = result.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n") || "";

  let parsed = parseJsonFromResponse(rawContent);
  if (!parsed) {
    parsed = {
      scores: { overall: 70 },
      analysis: rawContent,
      strengths: [],
      concerns: [],
      verdict: "Analysis completed.",
    };
  }
  parsed.scores = normalizeBiomechanicScores(parsed, "walk");

  await supabaseClient.from("activity_logs").insert({
    user_id: userId,
    action: "walk_posture_analysis_completed",
    resource_type: "walk_posture",
    metadata: { horse_name, include_hoof_analysis, hoof_count: hoof_photos?.length || 0 },
  });

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══ VISUAL ANALYSIS HANDLER — Claude Vision ONLY ═══
async function handleVisualAnalysis(
  body: Record<string, any>,
  userId: string,
  supabaseClient: any
): Promise<Response> {
  console.log("=== VISUAL ANALYSIS (Claude Vision) ===");

  const { file_path, media_type, horse_name, sire, dam, analysis_types, video_frames } = body;

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

  const analysisTypesText = (analysis_types || ["full"]).join(", ");
  const horseContext = [
    horse_name ? `Horse Name: ${horse_name}` : null,
    sire ? `Sire: ${sire}` : null,
    dam ? `Dam: ${dam}` : null,
  ].filter(Boolean).join("\n");

  const isVideoFrames = Array.isArray(video_frames) && video_frames.length > 0;

  const contentBlocks: any[] = [];

  if (isVideoFrames) {
    console.log(`[VISUAL] Processing ${video_frames.length} video frames via Claude Vision...`);

    for (let i = 0; i < video_frames.length; i++) {
      const frameBase64 = video_frames[i].replace(/^data:image\/\w+;base64,/, "");
      contentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: frameBase64 },
      });
      contentBlocks.push({
        type: "text",
        text: `Frame ${i + 1} of ${video_frames.length} (${Math.round((i / Math.max(video_frames.length - 1, 1)) * 100)}% through video)`,
      });
    }

    contentBlocks.push({
      type: "text",
      text: `You have ${video_frames.length} sequential frames extracted from a thoroughbred breeze-up / movement assessment video.

${horseContext ? `HORSE CONTEXT:\n${horseContext}` : ""}

ANALYSIS REQUESTED: ${analysisTypesText}

Apply the BloodstockAI Visual Biomechanics Protocol (frame-grounded, anatomy-anchored, no fabrication). Score the 7 mandatory categories and produce per-frame annotations.

Return a valid JSON object with this EXACT structure:
{
  "scores": {
    "posture": <0-100>,
    "forelimb_alignment": <0-100>,
    "hindlimb_alignment": <0-100>,
    "gait": <0-100>,
    "hoof_health": <0-100>,
    "health_indicators": <0-100>,
    "overall": <0-100>,
    "conformation": <0-100>,
    "musculature": <0-100>,
    "biomechanics": <0-100>,
    "behaviour": <0-100>
  },
  "score_flags": {
    "posture": "GREEN|AMBER|RED",
    "forelimb_alignment": "GREEN|AMBER|RED",
    "hindlimb_alignment": "GREEN|AMBER|RED",
    "gait": "GREEN|AMBER|RED",
    "hoof_health": "GREEN|AMBER|RED",
    "health_indicators": "GREEN|AMBER|RED"
  },
  "frame_annotations": [
    {
      "frame": <number>,
      "phase": "<stance|breakover|suspension|mid-swing|landing|trot|canter|gallop>",
      "key_observations": [
        "<Anatomical zone>: <specific observation anchored to that location in this frame>"
      ],
      "risk_flags": "<conformational/movement concern visible in this frame, or 'None'>",
      "positive_attributes": "<biomechanical strength visible in this frame, or 'None'>"
    }
  ],
  "score_justifications": {
    "posture": "<Evidence from frames + one sentence on what would improve the score>",
    "forelimb_alignment": "<Evidence + improvement note>",
    "hindlimb_alignment": "<Evidence + improvement note>",
    "gait": "<Evidence + improvement note>",
    "hoof_health": "<Evidence + improvement note>",
    "health_indicators": "<Evidence + improvement note>"
  },
  "analysis": "<Multi-paragraph expert biomechanical narrative. Cover stride length/symmetry/consistency, suspension and breakover quality, knee action, ground cover, asymmetry/compensation, conformation in motion, behaviour across frames. Reference specific frames and anatomical zones.>",
  "strengths": ["<specific biomechanical strength anchored to a frame/zone>"],
  "concerns": ["<specific concern anchored to a frame/zone>"],
  "commercial_verdict": "Yes|Conditional|No — <reasoning grounded in observed movement profile>",
  "racing_suitability": "Sprint (5–6f)|Mile|Middle Distance — <biomechanical rationale>",
  "watch_points": ["<specific area a vet/buyer should physically examine, anchored to flagged frame>"],
  "comparable_profile": "Top tier (>300K gns)|Mid (100–300K gns)|Lower (<100K gns) — <one-line justification>",
  "verdict": "<Final professional summary combining commercial verdict, racing suitability and any veterinary watch points.>"
}

RULES:
- Every observation MUST be anchored to something visible in the submitted frames.
- Do NOT fabricate details. If a zone is not assessable in any frame, state insufficient frame quality in that observation.
- GREEN ≥80, AMBER 65–79, RED <65 — assign flag accordingly.
- Reference both sides of the horse when alignment is assessed; note if only one side is visible.

Return ONLY the JSON object.`,
    });
  } else if (file_path) {
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage.from("pdf-uploads").download(file_path);

    if (downloadError || !fileData) {
      console.error("Storage download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download uploaded media from storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Data = btoa(binary);

    const ext = file_path.split(".").pop()?.toLowerCase() || "";
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    };
    const mimeType = mimeMap[ext] || "image/jpeg";

    console.log(`[VISUAL] Sending image (${Math.round(base64Data.length / 1024)}KB) to Claude Vision...`);

    contentBlocks.push({
      type: "image",
      source: { type: "base64", media_type: mimeType, data: base64Data },
    });
    contentBlocks.push({
      type: "text",
      text: `Analyze this single image of ${horse_name || "this horse"} using the BloodstockAI Visual Biomechanics Protocol.

${horseContext ? `HORSE CONTEXT:\n${horseContext}` : ""}

ANALYSIS REQUESTED: ${analysisTypesText}

Single-frame analysis — explicitly note limitations and which additional angles (lateral canter, front-on trot, behind trot, hoof close-up, square-stance conformation) would improve confidence.

Return a valid JSON object with this EXACT structure:
{
  "scores": {
    "posture": <0-100>,
    "forelimb_alignment": <0-100>,
    "hindlimb_alignment": <0-100>,
    "gait": <0-100>,
    "hoof_health": <0-100>,
    "health_indicators": <0-100>,
    "overall": <0-100>,
    "conformation": <0-100>,
    "musculature": <0-100>,
    "biomechanics": <0-100>,
    "behaviour": <0-100>
  },
  "score_flags": {
    "posture": "GREEN|AMBER|RED",
    "forelimb_alignment": "GREEN|AMBER|RED",
    "hindlimb_alignment": "GREEN|AMBER|RED",
    "gait": "GREEN|AMBER|RED",
    "hoof_health": "GREEN|AMBER|RED",
    "health_indicators": "GREEN|AMBER|RED"
  },
  "frame_annotations": [
    {
      "frame": 1,
      "phase": "<stance|trot|canter|conformation static|etc.>",
      "key_observations": [
        "<Anatomical zone>: <specific observation anchored to image, e.g. top-left, near hindquarter, left cannon bone>"
      ],
      "risk_flags": "<concern or 'None'>",
      "positive_attributes": "<strength or 'None'>"
    }
  ],
  "score_justifications": {
    "posture": "<Evidence from image + one sentence on what would improve the score>",
    "forelimb_alignment": "<Evidence + improvement note>",
    "hindlimb_alignment": "<Evidence + improvement note>",
    "gait": "<Evidence + improvement note (or 'Insufficient — single static frame')>",
    "hoof_health": "<Evidence + improvement note>",
    "health_indicators": "<Evidence + improvement note>"
  },
  "analysis": "<Multi-paragraph expert assessment anchored to anatomical zones visible in the image. Reference specific body parts, angles, proportions. State single-frame limitations.>",
  "strengths": ["<specific strength anchored to a zone>"],
  "concerns": ["<specific concern anchored to a zone>"],
  "commercial_verdict": "Yes|Conditional|No — <reasoning>",
  "racing_suitability": "Sprint (5–6f)|Mile|Middle Distance — <rationale>",
  "watch_points": ["<specific area for vet/buyer inspection>"],
  "comparable_profile": "Top tier (>300K gns)|Mid (100–300K gns)|Lower (<100K gns) — <justification>",
  "verdict": "<Final professional summary.>"
}

RULES:
- Every observation MUST be anchored to something visible in this image.
- Do NOT fabricate details. State 'Insufficient frame quality to assess [zone] — recommend additional angle' where applicable.
- GREEN ≥80, AMBER 65–79, RED <65.

Return ONLY the JSON object.`,
    });
  } else {
    return new Response(
      JSON.stringify({ error: "No file_path or video_frames provided" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const visualSystemPrompt = `You are BloodstockAI's expert equine biomechanics analyst — combining elite equine sports science, veterinary-grade anatomy, and senior bloodstock-agent commercial judgement (Keeneland, Tattersalls, Goffs).

You receive one or more video frames or photographs of a thoroughbred during a breeze-up or movement assessment. Produce a STRUCTURED, FRAME-GROUNDED visual analysis report.

MANDATORY PROTOCOL:
1. IMAGE ANNOTATION — Anchor every observation to a precise anatomical zone using standard equine terminology (e.g. "Right forelimb fetlock: slight medial deviation at impact — potential toeing-in"). Never make generic statements.
2. SCORING — 7 categories, each /100, each with 2–4 sentences of frame-grounded evidence:
   • Posture
   • Forelimb Alignment
   • Hindlimb Alignment
   • Gait
   • Hoof Health
   • Health Indicators
   • Overall Score
   Flag each category: GREEN ≥80, AMBER 65–79, RED <65.
3. FRAME-BY-FRAME — For each frame: phase of movement (stance / breakover / suspension / mid-swing / landing / trot / canter), 3–5 key biomechanical points using directional language ("top-left", "near hindquarter", "left cannon bone"), asymmetry/compensation/conformation flags.
4. FINAL ASSESSMENT — Commercial Verdict (Yes / Conditional / No), Racing Suitability (Sprint 5–6f / Mile / Middle Distance), 2–3 Watch Points for vet/buyer, Comparable Profile price tier (Top >300K / Mid 100–300K / Lower <100K gns).

CRITICAL RULES:
- Every observation MUST be anchored to something visible in the submitted frame(s). NO fabrication.
- If a frame is too blurry/cropped/low-res to assess a zone: "Insufficient frame quality to assess [zone] — recommend additional angle".
- Reference BOTH sides of the horse when assessing alignment; note when only one side is visible.
- Single-frame submissions: explicitly state limitations and specify which additional angles would raise confidence.
- Be honest, specific, evidence-based. Never use generic praise.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4000,
      temperature: 0.2,
      system: visualSystemPrompt,
      messages: [{ role: "user", content: contentBlocks }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[VISUAL] Claude Vision error:", response.status, errorText);
    if (response.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
    if (response.status === 401) throw new Error("Invalid Anthropic API key.");
    throw new Error(`Claude Vision error: ${response.status}`);
  }

  const result = await response.json();
  const rawContent = result.content
    ?.filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n") || "";

  console.log(`[VISUAL] Claude Vision response: ${rawContent.length} chars`);

  let parsed = parseJsonFromResponse(rawContent);

  if (!parsed) {
    console.error("[VISUAL] Failed to parse Claude response as JSON");
    parsed = {
      scores: { overall: 70 },
      analysis: rawContent,
      strengths: [],
      concerns: [],
      verdict: "Analysis completed but structured scoring could not be extracted.",
    };
  }

  await supabaseClient.from("activity_logs").insert({
    user_id: userId,
    action: "visual_analysis_completed",
    resource_type: "visual_analysis",
    metadata: { horse_name, media_type, analysis_types, file_path, frames_count: isVideoFrames ? video_frames.length : 0 },
  });

  console.log("=== VISUAL ANALYSIS COMPLETE ===");

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══ UNIFIED CLAUDE ANALYSIS HANDLER ═══
async function handleClaudeAnalysis(
  apiKey: string,
  type: string,
  payload: any,
  userId: string,
  supabaseClient: any
): Promise<Response> {
  console.log(`=== ${type.toUpperCase()} (service route) ===`);

  const systemPrompt = getSpecializedPrompt(type);
  const payloadObject = (() => {
    if (payload && typeof payload === "object") return payload;
    if (typeof payload !== "string") return null;
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  })();

  const extractField = (label: string) => {
    if (typeof payload !== "string") return "";
    const match = payload.match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"));
    return match?.[1]?.trim() || "";
  };

  const horseName = String(payloadObject?.horse_name || extractField("Horse") || extractField("HORSE") || "").trim();
  const sire = String(payloadObject?.sire || extractField("Sire") || extractField("SIRE") || "").trim();
  const dam = String(payloadObject?.dam || extractField("Dam") || extractField("DAM") || "").trim();
  const saleName = String(payloadObject?.sale_name || extractField("Sale") || extractField("SALE") || "").trim();
  const lotNumber = String(payloadObject?.lot_number || extractField("Lot") || extractField("LOT") || "").trim();

  let userContent = typeof payload === "string" ? payload : JSON.stringify(payload);

  if (type === "horse_report") {
    const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const labelBase = (horseName || `${sire}_${dam}` || "HORSE_REPORT").replace(/\W+/g, "_").toUpperCase().slice(0, 30);
    const subject = horseName || `${sire} x ${dam}`;
    const contextBits = `${sire ? `Sire: ${sire}.` : ""} ${dam ? `Dam: ${dam}.` : ""} ${saleName ? `Sale: ${saleName}.` : ""} ${lotNumber ? `Lot: ${lotNumber}.` : ""}`;

    if (TAVILY_API_KEY && (horseName || sire || dam)) {
      try {
        const researchResults = await tavilySearchParallel([
          { query: `"${subject}" thoroughbred pedigree sire dam dam-sire breeder owner trainer ${contextBits}`, label: `HR_ID_${labelBase}` },
          { query: `"${subject}" thoroughbred race record form ratings distance surface ${contextBits}`, label: `HR_PERF_${labelBase}` },
          { query: `"${subject}" thoroughbred auction sales price comparable siblings sire averages ${contextBits}`, label: `HR_MKT_${labelBase}` },
        ]);
        const researchBlock = formatTavilyContext(researchResults);
        userContent = `${userContent}\n\nVERIFIED LIVE RESEARCH (MANDATORY — use this as grounding, do not invent missing facts):\n\n${researchBlock}\n\nRULES:\n- Prioritize verified public facts from the live research above.\n- If research and user text conflict, prefer the verified fact and mention the uncertainty.\n- Do not fabricate values, race records, auction data, or ownership.`;
      } catch (researchError) {
        console.warn(`[${type}] Tavily research enrichment failed:`, researchError instanceof Error ? researchError.message : researchError);
      }
    } else if (PERPLEXITY_API_KEY && (horseName || sire || dam)) {
      try {
        const [identityResearch, performanceResearch, marketResearch] = await Promise.all([
          searchWithTiers(
            PERPLEXITY_API_KEY,
            `Find VERIFIED identity, pedigree, female-family context, sire, dam, dam sire, breeder, trainer, owner and sale references for thoroughbred \"${subject}\". ${contextBits} Return only verified details and state clearly when data is unavailable.`,
            SITE_TIERS.pedigree,
            `HR_ID_${labelBase}`
          ),
          searchWithTiers(
            PERPLEXITY_API_KEY,
            `Find VERIFIED racing, breeze-up, trainer, form, ratings, distance and surface information for thoroughbred \"${subject}\". ${contextBits} If unraced, state that clearly and focus on pedigree-performance signals only.`,
            SITE_TIERS.performance,
            `HR_PERF_${labelBase}`
          ),
          searchWithTiers(
            PERPLEXITY_API_KEY,
            `Find VERIFIED auction values, previous sale results, sire averages, sibling sale prices, dam produce prices and comparable sales for \"${subject}\". ${contextBits} Use real public sale data only.`,
            { tier1: SITE_TIERS.auctions, tier2: SITE_TIERS.marketInsights.tier1 },
            `HR_MKT_${labelBase}`
          ),
        ]);

        userContent = `${userContent}\n\nVERIFIED LIVE RESEARCH (MANDATORY — use this as grounding, do not invent missing facts):\n\n[IDENTITY & PEDIGREE]\n${identityResearch.content}\nSources: ${(identityResearch.citations || []).slice(0, 5).join(", ") || "none"}\n\n[PERFORMANCE & CONNECTIONS]\n${performanceResearch.content}\nSources: ${(performanceResearch.citations || []).slice(0, 5).join(", ") || "none"}\n\n[MARKET & SALES]\n${marketResearch.content}\nSources: ${(marketResearch.citations || []).slice(0, 5).join(", ") || "none"}\n\nRULES:\n- Prioritize verified public facts from the live research above.\n- If research and user text conflict, prefer the verified fact and mention the uncertainty.\n- Do not fabricate values, race records, auction data, or ownership.`;
      } catch (researchError) {
        console.warn(`[${type}] Live research enrichment failed:`, researchError instanceof Error ? researchError.message : researchError);
      }
    }
  }

  const maxTokens = ["mating_analysis", "broodmare_plan", "horse_report"].includes(type) ? 12000 : 8000;

  const claudeResponse = await callClaude(apiKey, systemPrompt, userContent, {
    maxTokens,
    temperature: 0.15,
    timeoutMs: type === "horse_report" ? 120000 : 90000,
  });

  const parsed = parseJsonFromResponse(claudeResponse);

  if (!parsed) {
    console.error(`[${type}] Failed to parse Claude response`);
    return new Response(
      JSON.stringify({ error: "PARSE_ERROR", raw: claudeResponse.substring(0, 500) }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  await supabaseClient.from("activity_logs").insert({
    user_id: userId,
    action: `${type}_generated`,
    resource_type: "service_route",
    metadata: { type },
  });

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handlePDFCatalog(
  apiKey: string,
  payload: { pdfBase64: string; fileName: string; instructions: string },
  userId: string,
  supabaseClient: any
): Promise<Response> {
  console.log(`=== PDF CATALOG ANALYSIS (service route) === ${payload.fileName}`);

  const systemPrompt = getSpecializedPrompt("pdf_catalog");

  const claudeResponse = await callClaudeWithDocument(
    apiKey,
    systemPrompt,
    payload.instructions,
    payload.pdfBase64,
    "application/pdf",
    { maxTokens: 8000 }
  );

  const parsed = parseJsonFromResponse(claudeResponse) || {
    auctionName: payload.fileName,
    totalHips: 0,
    hips: [],
    analysisNotes: ["Failed to parse catalog"],
  };

  await supabaseClient.from("activity_logs").insert({
    user_id: userId,
    action: "pdf_catalog_analyzed",
    resource_type: "service_route",
    metadata: { type: "pdf_catalog", fileName: payload.fileName },
  });

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handlePDFComparison(
  apiKey: string,
  payload: { pdfs: Array<{ fileName: string; base64: string }>; comparisonGoal: string; instructions: string },
  userId: string,
  supabaseClient: any
): Promise<Response> {
  console.log(`=== PDF COMPARISON (service route) === ${payload.pdfs.length} files`);

  const systemPrompt = getSpecializedPrompt("pdf_comparison");

  const extractedData: any[] = [];
  for (const pdf of payload.pdfs) {
    const extraction = await callClaudeWithDocument(
      apiKey,
      getSpecializedPrompt("pdf_catalog"),
      `Extract horses from: ${pdf.fileName}`,
      pdf.base64,
      "application/pdf",
      { maxTokens: 4000 }
    );
    extractedData.push({ fileName: pdf.fileName, data: parseJsonFromResponse(extraction) });
  }

  const comparisonPrompt = `Compare these extracted catalog entries and rank them.
Goal: ${payload.comparisonGoal}

Extracted data:
${JSON.stringify(extractedData, null, 2)}

Return the ranking JSON as specified.`;

  const claudeResponse = await callClaude(apiKey, systemPrompt, comparisonPrompt, { maxTokens: 8000 });
  const parsed = parseJsonFromResponse(claudeResponse) || {
    executiveSummary: "Comparison could not be completed",
    rankings: [],
  };

  await supabaseClient.from("activity_logs").insert({
    user_id: userId,
    action: "pdf_comparison_completed",
    resource_type: "service_route",
    metadata: { type: "pdf_comparison", fileCount: payload.pdfs.length },
  });

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
