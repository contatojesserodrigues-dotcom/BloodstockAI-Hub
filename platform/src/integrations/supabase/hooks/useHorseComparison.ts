import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface ComparisonHorse {
  name: string;
  country?: string;
  year_of_birth?: number;
  status?: string;
  sire?: string;
  dam?: string;
  career?: {
    starts: number;
    wins: number;
    places: number;
    win_percentage: number;
    earnings: string;
  };
  best_distance?: string;
  surface_preference?: string;
  class_level?: string;
  best_rpr?: number | null;
  best_beyer?: number | null;
  best_timeform?: number | null;
  trainer?: string;
  scores?: {
    speed_rating: number;
    consistency: number;
    class_rating: number;
    distance_versatility: number;
    surface_adaptability: number;
    earnings_index: number;
  };
}

export interface ComparisonResult {
  horses: ComparisonHorse[];
  comparison_analysis?: string;
  strengths_weaknesses?: Array<{
    name: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  head_to_head?: string;
  recommendation?: string;
  best_value?: string;
  best_performer?: string;
  error?: string;
}

export const useHorseComparison = () => {
  const { toast } = useToast();

  const compareHorses = useMutation({
    mutationFn: async (horse_names: string[]) => {
      const { data, error } = await supabase.functions.invoke('compare-horses', {
        body: { horse_names },
      });
      if (error) throw error;
      return data as ComparisonResult;
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({ title: "Comparison Warning", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "Comparison Complete!", description: `Compared ${data.horses?.length || 0} horses` });
      }
    },
    onError: (error: any) => {
      toast({ title: "Comparison Failed", description: error.message || "Failed to compare horses", variant: "destructive" });
    },
  });

  return { compareHorses };
};
