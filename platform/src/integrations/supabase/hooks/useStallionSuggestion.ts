import { useMutation } from '@tanstack/react-query';
import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction';
import { useToast } from '@/components/ui/use-toast';

interface StallionSuggestionRequest {
  mare_name: string;
  query?: string;
  influence_tags?: string[];
  breeding_goals?: string;
  budget_max?: number;
  preferred_surface?: 'turf' | 'dirt' | 'aw' | 'any';
  preferred_distance?: 'sprint' | 'middle' | 'staying' | 'any';
  country_preference?: string;
}

export const useStallionSuggestion = () => {
  const { toast } = useToast();

  const suggestStallions = useMutation({
    mutationFn: async (data: StallionSuggestionRequest) => {
      return invokeEdgeFunction('stallion-suggestion', {
        requireSession: true,
        body: data,
      });
    },
    onSuccess: (data) => {
      const top = data.analysis?.suggested_stallions?.[0];
      toast({
        title: "Stallion Suggestions Ready!",
        description: top
          ? `Top match: ${top.stallion_name} (Score: ${top.compatibility_score})`
          : "Analysis completed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Suggestion Failed",
        description: error.message || "Failed to find stallion suggestions",
        variant: "destructive",
      });
    },
  });

  return { suggestStallions };
};
