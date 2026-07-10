// Report structure for BloodstockAI Inspection Report

import type { IntelligenceScores } from "./types.ts";

export type InspectionReportSections = {
  horse_overview: Record<string, unknown>;
  pedigree_intelligence: Record<string, unknown>;
  biomechanical_analysis: Record<string, unknown>;
  conformation_analysis: Record<string, unknown>;
  movement_analysis: Record<string, unknown>;
  behaviour_profile: Record<string, unknown>;
  risk_assessment: Record<string, unknown>;
  racing_profile: Record<string, unknown>;
  investment_score: Record<string, unknown>;
};

export function buildReportPayload(input: {
  analysis: Record<string, unknown>;
  blocks: Record<string, unknown>[];
  intelligence: IntelligenceScores;
  biomechanics?: Record<string, unknown>;
  pedigreeResearch?: Record<string, unknown> | null;
}): InspectionReportSections {
  const a = input.analysis;
  return {
    horse_overview: {
      horse_name: a.horse_name,
      lot_ref: a.lot_ref,
      registration_number: a.registration_number,
      birth_year: a.birth_year,
      sex: a.sex,
      breed: a.breed,
      country: a.country,
      auction_name: a.auction_name,
      region: a.region,
      category: a.horse_category,
      engine: "BloodstockAI Equine Intelligence Inspection Engine™",
    },
    pedigree_intelligence: {
      score: input.intelligence.pedigree_intelligence,
      research: input.pedigreeResearch || null,
      pdf_url: a.pedigree_pdf_url || null,
    },
    biomechanical_analysis: {
      bpi: input.intelligence.bpi,
      score: input.intelligence.components.biomechanics,
      limb_symmetry: input.intelligence.limb_symmetry,
      joint_efficiency: input.intelligence.joint_efficiency,
      energy_economy: input.intelligence.energy_economy,
      spi_score: input.intelligence.spi_score,
      metrics: input.biomechanics || null,
    },
    conformation_analysis: {
      score: input.intelligence.components.conformation,
      blocks: input.blocks.filter((b) => /STATIC|MUSCULATURE|HOOF/.test(String(b.media_purpose || ""))),
    },
    movement_analysis: {
      score: input.intelligence.components.biomechanics,
      distance_profile: input.intelligence.distance_profile,
      blocks: input.blocks.filter((b) => /GAIT|BREEZE|VIDEO|GALLOP/.test(String(b.media_purpose || ""))),
    },
    behaviour_profile: {
      score: input.intelligence.behaviour,
      note: "Behaviour scoring from video tension indicators — Phase 2+ CV models.",
    },
    risk_assessment: {
      soundness_risk: input.intelligence.soundness_risk,
      hoof_health: input.intelligence.hoof_health,
    },
    racing_profile: {
      g1_potential: input.intelligence.g1_potential,
      distance_indices: input.intelligence.distance_indices,
      category: a.horse_category,
    },
    investment_score: {
      horse_intelligence_score: input.intelligence.horse_intelligence_score,
      bpi: input.intelligence.bpi,
      elite_potential: input.intelligence.elite_potential,
      components: input.intelligence.components,
      longevity: input.intelligence.longevity,
      roi: input.intelligence.roi,
      roi_prediction: a.roi_prediction || null,
      market_estimate: a.market_estimate || null,
    },
  };
}
