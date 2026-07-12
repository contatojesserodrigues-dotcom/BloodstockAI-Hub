import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

export type BreedingStatus = "maiden" | "proven";

export interface PreviousFoal {
  year?: number;
  sire?: string;
  sex?: string;
  sale_result?: string;
  racing_result?: string;
  current_status?: string;
}

export interface MareInput {
  name: string;
  year_of_birth: number;
  owner?: string;
  farm?: string;
  country?: string;
  registration_authority?: string;
  colour?: string;
  breeding_status: BreedingStatus;
  previous_foals?: PreviousFoal[];
  previous_stallions?: string[];
  produce_notes?: string;
}

export interface StallionRecommendation {
  rank: number;
  name: string;
  country?: string | null;
  stud_fee_usd?: number | null;
  compatibility_score: number;
  nick_rating: number;
  pedigree_score: number;
  commercial_score: number;
  genetic_diversity: number;
  inbreeding_level: number;
  outcross_rating: number;
  physical_compatibility: number;
  expected_distance: string;
  expected_surface: string;
  expected_maturity: string;
  commercial_appeal: number;
  auction_suitability: number;
  expected_roi_percent: number;
  risk_rating: number;
  confidence_score: number;
  reasoning: string;
}

export interface BroodmareSeason {
  year: number;
  mare_age_at_cover: number;
  strategic_goal: string;
  expected_market: string;
  commercial_goal: string;
  expected_yearling_value_usd: { low: number; mid: number; high: number };
  expected_roi_percent: number;
  expected_racing_profile: string;
  reasoning: string;
  top_stallions: StallionRecommendation[];
  alternative_stallions: { name: string; rationale: string; compatibility_score: number }[];
}

export interface BroodmarePlanResult {
  executive_summary: string;
  broodmare_overview: string;
  pedigree_analysis: Record<string, string>;
  genetic_analysis: Record<string, number | string>;
  physical_compatibility: Record<string, string>;
  performance_projection: Record<string, number>;
  commercial_analysis: Record<string, any>;
  scores: Record<string, number>;
  seasons: BroodmareSeason[];
  risk_assessment: string;
  final_recommendation: string;
}

export interface GenerateRequest {
  mare: MareInput;
  objectives: string[];
  duration_years: 2 | 3 | 4 | 5 | 6;
  pedigree_pdf_base64?: string;
  pedigree_pdf_name?: string;
  notes?: string;
}

export async function generateBroodmarePlan(req: GenerateRequest): Promise<{
  plan: BroodmarePlanResult;
  plan_id: string | null;
  pedigree: any;
}> {
  const data = await invokeEdgeFunction("broodmare-planning", {
    requireSession: true,
    body: req,
  });
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}