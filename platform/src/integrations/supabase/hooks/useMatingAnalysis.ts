import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../client';
import { useToast } from '@/components/ui/use-toast';

interface MatingRequest {
  mare_name: string;
  stallion_names: string[];
  goals?: {
    race_type?: string;
    auction_class?: string;
    breeding_goal?: string;
  };
}

export const useMatingAnalysis = () => {
  const { toast } = useToast();

  const analyzeMating = useMutation({
    mutationFn: async (data: MatingRequest) => {
      const { data: result, error } = await supabase.functions.invoke('mating-analysis', {
        body: data,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      const topStallion = data.analysis?.ranking?.[0];
      toast({
        title: "Mating Analysis Complete!",
        description: topStallion 
          ? `Top match: ${topStallion.stallion_name}`
          : "Analysis completed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze mating",
        variant: "destructive",
      });
    },
  });

  return { analyzeMating };
};

export const useMatings = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['matings', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('matings')
        .select('*, stallion:stallion_id(name), mare:mare_id(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false});

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};
