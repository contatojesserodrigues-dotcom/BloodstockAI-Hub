import { useMutation } from '@tanstack/react-query';
import { supabase } from '../client';
import { useToast } from '@/components/ui/use-toast';

interface HorseSearchRequest {
  horse_name: string;
  sire?: string;
  dam?: string;
  dam_sire?: string;
  is_young_horse?: boolean;
  filters?: {
    race_type?: string;
    auction_class?: string;
    goal?: string;
  };
}

interface HorsePerformance {
  date: string;
  position: number;
  track: string;
  distance: number;
  prize_money: number;
  race_type: string;
  race_name?: string;
}

interface HorseSale {
  sale_price: number;
  date: string;
  auction_house: string;
  currency: string;
  sale_name?: string;
  buyer?: string;
  seller?: string;
}

interface HorsePedigree {
  sire: string;
  dam: string;
  dam_sire: string;
  sire_sire?: string;
  sire_dam?: string;
  dam_dam?: string;
  sire_sire_sire?: string;
  sire_sire_dam?: string;
  sire_dam_sire?: string;
  sire_dam_dam?: string;
  dam_sire_sire?: string;
  dam_sire_dam?: string;
  dam_dam_sire?: string;
  dam_dam_dam?: string;
  generation_3?: string[];
  generation_4?: string[];
  generation_5?: string[];
  siblings: string[];
  progeny: string[];
}

export interface HorseInbreeding {
  pattern: string;
  coefficient: string;
  assessment: string;
  details: string;
}

export interface HorseDosage {
  profile: string;
  dosage_index: string;
  center_of_distribution: string;
  distance_aptitude: string;
  details: string;
}

export interface HorseNickAnalysis {
  cross: string;
  rating: string;
  stakes_winners_from_cross: string;
  justification: string;
}

export interface HorseCareerStats {
  starts: number;
  wins: number;
  seconds: number;
  thirds: number;
  earnings: number;
  earnings_currency: string;
  win_rate: string;
  best_speed_figure: string;
  best_distance: string;
  best_surface: string;
  highest_class: string;
}

export interface SiblingDetail {
  name: string;
  year: number;
  sire: string;
  record: string;
  best_achievement: string;
}

export interface HorseSiblingsAnalysis {
  total_foals: number;
  total_raced: number;
  total_winners: number;
  stakes_winners: number;
  stakes_percentage: string;
  best_sibling: string;
  dam_rating: string;
  details: SiblingDetail[];
}

export interface HorseScores {
  pedigree_quality: number;
  performance_rating: number;
  nick_score: number;
  dosage_score: number;
  overall: number;
  potential_rating: string;
  data_confidence: string;
}

export interface HorseSearchResult {
  name: string;
  pedigree: HorsePedigree;
  performance: HorsePerformance[];
  sales: HorseSale[];
  current_owner: string;
  breeder: string;
  trainer?: string;
  year_of_birth: number;
  sex: string;
  country: string;
  color?: string;
  score: number;
  insight: string;
  inbreeding?: HorseInbreeding;
  dosage?: HorseDosage;
  nick_analysis?: HorseNickAnalysis;
  career_stats?: HorseCareerStats;
  siblings_analysis?: HorseSiblingsAnalysis;
  scores?: HorseScores;
  key_insights?: string[];
  recommendation?: string;
}

interface SearchResponse {
  horses: HorseSearchResult[];
  error?: string;
}

export const useHorseSearch = () => {
  const { toast } = useToast();

  const searchHorses = useMutation({
    mutationFn: async (data: HorseSearchRequest) => {
      const { data: result, error } = await supabase.functions.invoke('horse-search', {
        body: data,
      });

      if (error) throw error;
      return result as SearchResponse;
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({
          title: "Search Warning",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Search Complete!",
          description: `Found ${data.horses?.length || 0} horses with comprehensive data from global sources.`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search horses",
        variant: "destructive",
      });
    },
  });

  return { searchHorses };
};
