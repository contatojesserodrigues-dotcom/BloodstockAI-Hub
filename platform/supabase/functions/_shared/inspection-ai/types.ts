// Shared types — Equine Intelligence Inspection Engine™

export type InspectionCategory =
  | "FOAL"
  | "YEARLING"
  | "FLAT_YEARLING"
  | "WEANLING"
  | "BREEZE_UP"
  | "FLAT_IN_TRAINING"
  | "NH_STORE_YOUNG"
  | "NH_IN_TRAINING"
  | "BROODMARE_STALLION"
  | "STALLION_PROSPECT";

export type InspectionRegion =
  | "Ireland"
  | "UK"
  | "USA"
  | "Australia"
  | "France"
  | "Japan"
  | "UAE"
  | "Other";

export type VideoType = "walk" | "trot" | "gallop" | "breeze" | "general";

export type SoundnessRisk = "Low" | "Medium" | "High";

export type ComponentScores = {
  biomechanics: number;
  pedigree: number;
  conformation: number;
  behaviour: number;
  commercial: number;
};

export type ConformationBreakdown = {
  balance: number;
  leg_alignment: number;
  shoulder: number;
  hindquarter: number;
  bone_structure: number;
  total: number;
};

export type PedigreeBreakdown = {
  sire_performance: number;
  dam_performance: number;
  family_black_type: number;
  cross_compatibility: number;
  total: number;
};

export type BehaviourBreakdown = {
  calmness: number;
  focus: number;
  handling: number;
  stress_recovery: number;
  total: number;
};

export type DistanceIndices = {
  sprint: number;
  mile: number;
  classic: number;
  stayer: number;
  recommended?: string;
};

/** @deprecated use DistanceIndices */
export type DistanceProfile = DistanceIndices & { stamina?: number };

export type G1PotentialIndex = {
  score: number;
  tier_label: string;
  probability_label: string;
  factors: string[];
};

export type LongevityScore = {
  score: number;
  risk_components: {
    asymmetry: number;
    conformation_issues: number;
    hoof_risk: number;
    movement_irregularity: number;
  };
  total_risk: number;
};

export type RoiScore = {
  score: number;
  components: {
    performance_potential: number;
    pedigree_value: number;
    market_demand: number;
    risk_adjustment: number;
  };
};

export type IntelligenceScores = {
  /** Horse Intelligence Score = G1 Potential composite */
  horse_intelligence_score: number;
  elite_potential: number;
  bpi: number;
  components: ComponentScores;
  conformation_breakdown?: ConformationBreakdown;
  pedigree_breakdown?: PedigreeBreakdown;
  behaviour_breakdown?: BehaviourBreakdown;
  g1_potential: G1PotentialIndex;
  distance_indices: DistanceIndices;
  distance_profile: DistanceIndices;
  longevity: LongevityScore;
  roi: RoiScore;
  soundness_risk: SoundnessRisk;
  limb_symmetry?: number;
  joint_efficiency?: number;
  hoof_health?: number;
  behaviour?: number;
  pedigree_intelligence?: number;
  energy_economy?: number;
  spi_score?: number;
};

export type PoseFrameInput = {
  index: number;
  timestampMs: number;
  keypoints?: Record<string, { x: number; y: number }> | null;
  angles?: Record<string, number | null>;
  stridePhase?: string;
  confidence?: number;
};

export type BiomechanicsInput = {
  bpi?: number;
  stride_efficiency?: number;
  motion_symmetry?: number;
  joint_efficiency?: number;
  power_generation?: number;
  energy_economy?: number;
  spi_score?: number;
  asymmetry_pct?: number;
  movement_consistency?: number;
};
