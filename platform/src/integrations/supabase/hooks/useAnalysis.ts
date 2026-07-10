import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../client';
import { useToast } from '@/components/ui/use-toast';

interface AnalysisRequest {
  horse_name: string;
  pedigree_data?: any;
  performance_data?: any;
  analysis_type: string;
}

export const useAnalysis = () => {
  const { toast } = useToast();

  const runAnalysis = useMutation({
    mutationFn: async (data: AnalysisRequest) => {
      const { data: result, error } = await supabase.functions.invoke('ai-analysis', {
        body: data,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis Complete!",
        description: "Your bloodstock analysis is ready.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to complete analysis",
        variant: "destructive",
      });
    },
  });

  return { runAnalysis };
};

export const useAnalysisReports = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['analysis-reports', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};
