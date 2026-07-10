import { supabase } from "@/integrations/supabase/client";
import { searchHorsePedigree, searchHorsePerformance } from "./horseSearchService";
import type { HorseIdentifier, PedigreeData, PerformanceData } from "./horseSearchService";

export interface CompleteHorseProfile {
  identifier: HorseIdentifier;
  pedigree: PedigreeData;
  performance?: PerformanceData;
  geneticProfile: GeneticProfile;
  aiReport: AIReport;
  dataQuality: DataQualityReport;
}

export interface GeneticProfile {
  dosageIndex: number;
  centreOfDistribution: number;
  dosageProfile: Record<string, number>;
  dominantBloodlines: string[];
  racingType: string;
  breedingPotential: string;
  keyAncestors: string[];
}

export interface AIReport {
  summary: string;
  strengths: string[];
  concerns: string[];
  racingProspects: string;
  breedingValue: string;
  marketAssessment: string;
  recommendedDistance: string;
  recommendedSurface: string;
}

export interface DataQualityReport {
  overallScore: number;
  pedigreeComplete: boolean;
  performanceVerified: boolean;
  sourcesUsed: string[];
  missingFields: string[];
  lastUpdated: string;
}

export async function getCompleteHorseProfile(
  identifier: HorseIdentifier
): Promise<CompleteHorseProfile> {
  const [pedigreeResult, performanceResult] = await Promise.allSettled([
    searchHorsePedigree(identifier),
    searchHorsePerformance(identifier),
  ]);

  const pedigree = pedigreeResult.status === "fulfilled" && pedigreeResult.value
    ? pedigreeResult.value
    : null;

  const performance = performanceResult.status === "fulfilled" && performanceResult.value
    ? performanceResult.value
    : null;

  if (!pedigree) throw new Error(`Could not retrieve pedigree for ${identifier.name}`);

  const [aiReport, geneticProfile] = await Promise.all([
    generateHorseAIReport(identifier, pedigree, performance),
    Promise.resolve(calculateGeneticProfile(pedigree)),
  ]);

  return {
    identifier,
    pedigree,
    performance: performance || undefined,
    geneticProfile,
    aiReport,
    dataQuality: assessDataQuality(pedigree, performance),
  };
}

async function generateHorseAIReport(
  identifier: HorseIdentifier,
  pedigree: PedigreeData,
  performance: PerformanceData | null
): Promise<AIReport> {
  const { data, error } = await supabase.functions.invoke("ai-analysis", {
    body: {
      type: "horse_report",
      payload: `Provide a complete bloodstock analysis for:
HORSE: ${identifier.name} | ${identifier.country} | ${identifier.birthYear || "?"} | ${identifier.sex || "?"}

PEDIGREE:
Sire: ${pedigree.sire.name} (${pedigree.sire.country}, ${pedigree.sire.birthYear})
Dam: ${pedigree.dam.name} (${pedigree.dam.country}, ${pedigree.dam.birthYear})
Dam Sire: ${pedigree.damSire.name}
3rd Generation: ${pedigree.generation3.join(" | ")}
Inbreeding: ${pedigree.inbreeding.join(", ") || "None detected"}
Source: ${pedigree.sourceName} | Confidence: ${(pedigree.confidence * 100).toFixed(0)}%

${performance ? `RACING RECORD:
${performance.totalStarts} starts | ${performance.wins}W-${performance.places}P-${performance.shows}S
Best Rating: ${performance.bestRating.value} (${performance.bestRating.system})
Class: ${performance.raceClass} | Distance: ${performance.bestDistance} | Surface: ${performance.trackType}
Earnings USD: $${performance.earnings.usd?.toLocaleString() || "N/A"}
Last 5 Races:
${performance.last5Races.map(r => `${r.date} | ${r.track} | P:${r.position} | ${r.distance} | ${r.going} | ${r.class}`).join("\n")}` : "No racing record available"}

Return ONLY this JSON:
{
  "summary": "2-3 sentence professional overview",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "concerns": ["concern 1", "concern 2"],
  "racingProspects": "detailed racing projection",
  "breedingValue": "breeding assessment",
  "marketAssessment": "commercial value assessment",
  "recommendedDistance": "optimal distance range",
  "recommendedSurface": "Turf/Dirt/Synthetic/Any"
}`,
    },
  });

  if (error) throw new Error("Horse AI report failed");
  return data as AIReport;
}

function calculateGeneticProfile(pedigree: PedigreeData): GeneticProfile {
  const knownProfiles: Record<string, { b: number; i: number; c: number; s: number; p: number }> = {
    "Galileo":          { b: 0, i: 4, c: 4, s: 0, p: 0 },
    "Frankel":          { b: 2, i: 4, c: 2, s: 0, p: 0 },
    "Dubawi":           { b: 2, i: 2, c: 4, s: 0, p: 0 },
    "Danehill":         { b: 2, i: 4, c: 2, s: 0, p: 0 },
    "Northern Dancer":  { b: 2, i: 4, c: 2, s: 0, p: 0 },
    "Sadler's Wells":   { b: 0, i: 4, c: 4, s: 0, p: 0 },
    "Storm Cat":        { b: 4, i: 2, c: 2, s: 0, p: 0 },
    "Mr. Prospector":   { b: 4, i: 2, c: 2, s: 0, p: 0 },
    "Secretariat":      { b: 2, i: 2, c: 4, s: 0, p: 0 },
    "Kingmambo":        { b: 2, i: 4, c: 2, s: 0, p: 0 },
    "Sea The Stars":    { b: 0, i: 2, c: 6, s: 0, p: 0 },
    "Deep Impact":      { b: 0, i: 2, c: 4, s: 2, p: 0 },
    "Justify":          { b: 2, i: 2, c: 4, s: 0, p: 0 },
    "American Pharoah": { b: 2, i: 4, c: 2, s: 0, p: 0 },
    "Shalaa":           { b: 6, i: 2, c: 0, s: 0, p: 0 },
  };

  const sp = knownProfiles[pedigree.sire.name] || { b: 1, i: 2, c: 2, s: 1, p: 0 };
  const dp2 = { brilliant: sp.b, intermediate: sp.i, classic: sp.c, solid: sp.s, professional: sp.p };
  const total = Object.values(dp2).reduce((a, b) => a + b, 0) || 1;
  const num = dp2.brilliant + dp2.intermediate + dp2.classic;
  const den = dp2.classic + dp2.solid + dp2.professional || 1;
  const di = Math.round((num / den) * 100) / 100;
  const cd = Math.round(((dp2.brilliant - dp2.professional) / total) * 100) / 100;

  return {
    dosageIndex: di,
    centreOfDistribution: cd,
    dosageProfile: dp2,
    dominantBloodlines: [pedigree.sire.name, pedigree.damSire.name].filter(Boolean),
    racingType: di > 4 ? "Sprinter" : di > 2 ? "Miler" : di > 1 ? "Classic" : "Stayer",
    breedingPotential: "Requires post-career assessment",
    keyAncestors: pedigree.generation3,
  };
}

function assessDataQuality(pedigree: PedigreeData, performance: PerformanceData | null): DataQualityReport {
  const sourcesUsed: string[] = [];
  const missingFields: string[] = [];
  let score = 0;

  if (pedigree.sire?.name) score += 20; else missingFields.push("sire");
  if (pedigree.dam?.name) score += 20; else missingFields.push("dam");
  if (pedigree.damSire?.name) score += 10; else missingFields.push("damSire");
  if (pedigree.generation3?.length >= 4) score += 10; else missingFields.push("generation3");
  if (pedigree.sourceUrl) { score += 10; sourcesUsed.push(pedigree.sourceName); }
  else missingFields.push("pedigree_source_url");

  if (performance) {
    score += 10;
    if (performance.totalStarts > 0) score += 10;
    if (performance.bestRating?.value > 0) score += 5;
    if (performance.last5Races?.length > 0) score += 5;
    if (performance.sourceUrl) sourcesUsed.push(performance.sourceUrl);
  } else {
    missingFields.push("performance_data");
  }

  return {
    overallScore: score,
    pedigreeComplete: score >= 60,
    performanceVerified: !!performance,
    sourcesUsed,
    missingFields,
    lastUpdated: new Date().toISOString(),
  };
}
