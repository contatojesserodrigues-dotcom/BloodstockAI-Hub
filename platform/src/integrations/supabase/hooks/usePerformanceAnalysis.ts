import { useMutation } from '@tanstack/react-query';
import { supabase } from '../client';
import { useToast } from '@/components/ui/use-toast';

interface PerformanceRequest {
  horse_name?: string;
  country?: string;
  year_of_birth?: number;
  pedigree_pdf_base64?: string;
  pedigree_pdf_mime?: string;
}

export interface PerformanceResult {
  horse_name: string;
  country?: string;
  year_of_birth?: number;
  status?: string;
  career?: {
    starts: number;
    wins: number;
    places: number;
    unplaced: number;
    earnings: string;
    win_percentage: number;
  };
  speed_figures?: {
    best_beyer: number | null;
    best_rpr: number | null;
    best_timeform: number | null;
    current_rpr: number | null;
    best_figure: string;
    avg_last_5: number | null;
    trend: string;
  };
  distance?: {
    best_distance: string;
    optimal_range: string;
    distances_to_avoid: string;
    record_by_distance: string;
  };
  surface?: {
    dirt: string;
    turf: string;
    synthetic: string;
    preference: string;
    confidence: string;
  };
  class_analysis?: {
    best_class: string;
    g1_record: string;
    g2_record: string;
    g3_record: string;
    listed_record: string;
    class_ceiling: string;
    class_assessment: string;
  };
  recent_form?: Array<{
    date: string;
    race: string;
    track: string;
    distance: string;
    going: string;
    surface: string;
    position: string;
    margin: string;
    figure: string;
    jockey: string;
    comment: string;
  }>;
  track_conditions?: {
    best_condition: string;
    firm_record: string;
    good_record: string;
    soft_record: string;
    heavy_record: string;
    going_preference: string;
  };
  connections?: {
    trainer: string;
    trainer_win_rate: string;
    owner: string;
    jockey: string;
    jockey_win_rate: string;
    breeder: string;
  };
  scores?: {
    speed_rating: number;
    consistency: number;
    class_level: string;
    distance_profile: string;
    surface_pref: string;
    going_preference: string;
    form_trend: string;
    data_confidence: string;
  };
  insights?: string[];
  recommendation?: string;
  report_text?: string;
  citations?: string[];
  subject_disambiguation?: string;
  roster?: Array<{
    role: string;
    name: string;
    country?: string;
    year_of_birth?: number;
    peak_rpr?: number | null;
    rpr_status?: string;
    code?: string;
    trip?: string;
    record_summary?: string;
    black_type?: string;
    source_url?: string;
  }>;
  synthesis?: {
    stronger_side?: string;
    exact_cross_read?: string;
    trip_and_code?: string;
    subject_potential?: string;
  };
  evidence_quality?: {
    verified_count?: number;
    not_verified_count?: number;
    note?: string;
  };
  executive_summary?: {
    age?: string;
    current_racing_level?: string;
    future_potential?: string;
    commercial_rating?: string;
    consistency_rating?: string;
    improvement_trend?: string;
    performance_confidence?: string;
    risk_rating?: string;
    overall_performance_score?: number;
  };
  performance_timeline?: Array<{
    season?: string;
    starts?: number;
    wins?: number;
    peak_rpr?: number | null;
    avg_rpr?: number | null;
    class_level?: string;
    note?: string;
  }>;
  race_by_race?: Array<{
    date?: string;
    course?: string;
    country?: string;
    distance?: string;
    surface?: string;
    going?: string;
    class?: string;
    position?: string;
    field_size?: number | null;
    weight?: string;
    jockey?: string;
    trainer?: string;
    official_rating?: number | null;
    race_rating?: number | null;
    comment?: string;
  }>;
  distance_buckets?: Array<{ label: string; starts: number; wins: number; places?: number; best_rpr?: number | null; score: number }>;
  distance_recommendation?: string;
  surface_buckets?: Array<{ label: string; starts: number; wins: number; score: number }>;
  going_buckets?: Array<{ label: string; starts: number; wins: number; score: number }>;
  pace_profile?: {
    early_speed?: number;
    cruising_speed?: number;
    acceleration?: number;
    finishing_strength?: number;
    running_style?: string;
    commentary?: string;
  };
  consistency_analysis?: {
    consistency_score?: number;
    rating_variability?: string;
    standard_deviation?: number | null;
    average_performance?: number | null;
    peak_performance?: number | null;
    worst_performance?: number | null;
    reliability_score?: number;
  };
  competition_analysis?: {
    avg_opponent_rating?: number | null;
    vs_black_type?: string;
    vs_group_horses?: string;
    under_pressure?: string;
    opposition_strength_score?: number;
  };
  trainer_analysis?: { current_trainer?: string; trend_with_trainer?: string; trainer_pattern?: string; score?: number };
  jockey_analysis?: { primary_jockeys?: string[]; win_rates?: string; consistency_note?: string; score?: number };
  pedigree_vs_performance?: {
    expected_distance?: string;
    expected_surface?: string;
    development_pattern?: string;
    verdict?: string;
    commentary?: string;
  };
  commercial_intelligence?: {
    racing_prospect_value_usd?: string;
    broodmare_value_usd?: string;
    stallion_prospect_value_usd?: string;
    export_value_usd?: string;
    nh_value_usd?: string;
    commercial_appeal?: number;
    auction_demand?: string;
    future_potential?: string;
    roi_projection?: string;
    disclaimer?: string;
  };
  future_projection?: {
    rating_ceiling?: string;
    black_type_potential?: string;
    listed_potential?: string;
    group_potential?: string;
    classic_potential?: string;
    nh_potential?: string;
    best_campaign?: string;
    ideal_distance?: string;
    ideal_surface?: string;
    career_recommendation?: string;
  };
  bloodstock_scores?: {
    performance?: number;
    pedigree?: number;
    commercial?: number;
    consistency?: number;
    distance_suitability?: number;
    surface_suitability?: number;
    improvement?: number;
    future_potential?: number;
    market_appeal?: number;
    roi_potential?: number;
    risk?: number;
    overall?: number;
  };
  professional_commentary?: string;
  error?: string;
}

export const usePerformanceAnalysis = () => {
  const { toast } = useToast();

  const analyzePerformance = useMutation({
    mutationFn: async (data: PerformanceRequest) => {
      const { data: result, error } = await supabase.functions.invoke('performance-analysis', {
        body: data,
      });

      if (error) throw error;
      return result as PerformanceResult;
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({
          title: "Analysis Warning",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Performance Analysis Complete!",
          description: `Generated performance report for ${data.horse_name}`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze performance",
        variant: "destructive",
      });
    },
  });

  return { analyzePerformance };
};
