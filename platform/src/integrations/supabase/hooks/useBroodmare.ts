import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../client';
import { useToast } from '@/components/ui/use-toast';

interface BroodmareRequest {
  mare_id?: string;
  mare_name?: string;
  file_data?: string;
  file_name?: string;
  breeding_goals?: string;
  filters?: {
    stud_fee_min?: number;
    stud_fee_max?: number;
    country?: string;
    type?: string;
    commercial_only?: boolean;
  };
}

export const useBroodmarePlan = () => {
  const { toast } = useToast();

  const createPlan = useMutation({
    mutationFn: async (data: BroodmareRequest) => {
      const { data: result, error } = await supabase.functions.invoke('broodmare-plan', {
        body: data,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Broodmare Plan Created!",
        description: `Generated recommendations for ${data.mare?.name}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Plan Creation Failed",
        description: error.message || "Failed to create broodmare plan",
        variant: "destructive",
      });
    },
  });

  return { createPlan };
};

export const useBroodmarePlans = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['broodmare-plans', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('broodmare_plans')
        .select('*, mare:mare_id(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};
