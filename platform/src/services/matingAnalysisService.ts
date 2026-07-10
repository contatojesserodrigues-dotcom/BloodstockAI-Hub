import { supabase } from "@/integrations/supabase/client";
import type { HorseIdentifier, PedigreeData, PerformanceData } from "./horseSearchService";

export interface FoalRecord {
  year: number;
  sire: string;
  name?: string;
  sex: string;
  bestRaceClass?: string;
  bestRating?: number;
  salePrice?: { amount: number; currency: string; auction: string };
}

export interface MatingAnalysisRequest {
  mare: {
    identifier: HorseIdentifier;
    pedigree: PedigreeData;
    performance?: PerformanceData;
    previousFoals?: FoalRecord[];
  };
  stallion: {
    identifier: HorseIdentifier;
    pedigree: PedigreeData;
    performance?: PerformanceData;
    studFee?: number;
    studFeeCurrency?: string;
  };
  goals?: {
    targetDistance?: "Sprint" | "Mile" | "Middle" | "Long" | "Extreme";
    targetSurface?: "Turf" | "Dirt" | "Synthetic" | "All-Weather";
    targetClass?: "G1" | "G2" | "G3" | "Listed" | "Black-Type";
    primaryMarket?: "Racing" | "Breeding" | "Sales";
    salesTarget?: string;
  };
}

export interface MatingAnalysis {
  compatibilityScore: number;
  nickRating: string;
  geneticCompatibility: {
    dosageIndex: number;
    centreOfDistribution: number;
    dosageProfile: { brilliant: number; intermediate: number; classic: number; solid: number; professional: number };
    expectedDistanceAptitude: string;
    dominantBloodlines: string[];
    rareBloodlines: string[];
    bloodlineConcentrations: Array<{ ancestor: string; occurrences: string; effect: string; geneticStrength: string }>;
  };
  conformationProjection: string;
  raceTypeProjection: {
    primaryDistance: string;
    secondaryDistance: string;
    likelySurface: string;
    peakAge: string;
    raceStyle: string;
  };
  keyStrengths: string[];
  keyRisks: string[];
  inbreedingAnalysis: {
    present: boolean;
    pattern: string;
    coefficient: number;
    assessment: "Beneficial" | "Acceptable" | "Cautionary" | "Excessive";
    explanation: string;
  };
  salesProjection?: {
    estimatedRange: { low: number; high: number; currency: string };
    targetAuction: string;
    hipPotential: string;
    keyBuyersProfile: string;
  };
  recommendation: "HIGHLY_RECOMMENDED" | "RECOMMENDED" | "ACCEPTABLE" | "CAUTION" | "NOT_RECOMMENDED";
  reasoning: string;
  alternativeStallions?: string[];
}

export async function analyzeMating(request: MatingAnalysisRequest): Promise<MatingAnalysis> {
  const { data, error } = await supabase.functions.invoke("ai-analysis", {
    body: {
      type: "mating_analysis",
      payload: buildMatingPrompt(request),
    },
  });

  if (error) throw new Error("Mating analysis failed");
  return data as MatingAnalysis;
}

export async function generateBroodmarePlan(
  mare: MatingAnalysisRequest["mare"],
  candidateStallions: MatingAnalysisRequest["stallion"][],
  goals: MatingAnalysisRequest["goals"]
): Promise<{ ranked: Array<{ stallion: string; score: number; analysis: MatingAnalysis }> }> {
  const analyses = await Promise.all(
    candidateStallions.map(stallion =>
      analyzeMating({ mare, stallion, goals })
        .then(analysis => ({ stallion: stallion.identifier.name, score: analysis.compatibilityScore, analysis }))
        .catch(() => null)
    )
  );

  const valid = analyses.filter(Boolean) as Array<{ stallion: string; score: number; analysis: MatingAnalysis }>;
  valid.sort((a, b) => b.score - a.score);

  return { ranked: valid };
}

function buildMatingPrompt(request: MatingAnalysisRequest): string {
  const { mare, stallion, goals } = request;
  return `Perform a COMPLETE SCIENTIFIC BREEDING ANALYSIS for this proposed mating.

MARE: ${mare.identifier.name} (${mare.identifier.country}, ${mare.identifier.birthYear})
Sire: ${mare.pedigree.sire.name} (${mare.pedigree.sire.country}, ${mare.pedigree.sire.birthYear})
Dam: ${mare.pedigree.dam.name} (${mare.pedigree.dam.country})
Dam Sire: ${mare.pedigree.damSire.name}
Generation 3: ${mare.pedigree.generation3.join(" | ")}
Inbreeding: ${mare.pedigree.inbreeding.join(", ") || "None detected"}
${mare.performance ? `Racing: ${mare.performance.totalStarts} starts | ${mare.performance.wins}W | Best Rating: ${mare.performance.bestRating.value} ${mare.performance.bestRating.system} | Class: ${mare.performance.raceClass} | ${mare.performance.bestDistance} | ${mare.performance.trackType}` : ""}
${mare.previousFoals?.length ? `Previous Foals:\n${mare.previousFoals.map(f => `${f.year} | ${f.sire} | ${f.sex} | ${f.name || "unnamed"} | ${f.bestRaceClass || "-"} | Rating: ${f.bestRating || "-"}`).join("\n")}` : ""}

STALLION: ${stallion.identifier.name} (${stallion.identifier.country}, ${stallion.identifier.birthYear})
Sire: ${stallion.pedigree.sire.name} (${stallion.pedigree.sire.country})
Dam: ${stallion.pedigree.dam.name}
Dam Sire: ${stallion.pedigree.damSire.name}
Generation 3: ${stallion.pedigree.generation3.join(" | ")}
Inbreeding: ${stallion.pedigree.inbreeding.join(", ") || "None"}
${stallion.performance ? `Racing: ${stallion.performance.totalStarts} starts | ${stallion.performance.wins}W | Best Rating: ${stallion.performance.bestRating.value} ${stallion.performance.bestRating.system} | Class: ${stallion.performance.raceClass}` : ""}
${stallion.studFee ? `Stud Fee: ${stallion.studFeeCurrency || "USD"} ${stallion.studFee.toLocaleString()}` : ""}

GOALS:
Target Distance: ${goals?.targetDistance || "Not specified"}
Target Surface: ${goals?.targetSurface || "Not specified"}
Target Class: ${goals?.targetClass || "Not specified"}
Primary Market: ${goals?.primaryMarket || "Racing"}
Sales Target: ${goals?.salesTarget || "Not specified"}

Perform: Dosage Analysis, Nick Rating, Inbreeding coefficient, Genetic compatibility, Race type projection, Commercial assessment.

Return ONLY this exact JSON:
{
  "compatibilityScore": 0,
  "nickRating": "A/B/C",
  "geneticCompatibility": {
    "dosageIndex": 0.0,
    "centreOfDistribution": 0.0,
    "dosageProfile": { "brilliant": 0, "intermediate": 0, "classic": 0, "solid": 0, "professional": 0 },
    "expectedDistanceAptitude": "",
    "dominantBloodlines": [],
    "rareBloodlines": [],
    "bloodlineConcentrations": [{ "ancestor": "", "occurrences": "", "effect": "", "geneticStrength": "" }]
  },
  "conformationProjection": "",
  "raceTypeProjection": { "primaryDistance": "", "secondaryDistance": "", "likelySurface": "", "peakAge": "", "raceStyle": "" },
  "keyStrengths": [],
  "keyRisks": [],
  "inbreedingAnalysis": { "present": false, "pattern": "", "coefficient": 0.0, "assessment": "Acceptable", "explanation": "" },
  "salesProjection": { "estimatedRange": { "low": 0, "high": 0, "currency": "USD" }, "targetAuction": "", "hipPotential": "", "keyBuyersProfile": "" },
  "recommendation": "RECOMMENDED",
  "reasoning": "",
  "alternativeStallions": []
}`;
}
