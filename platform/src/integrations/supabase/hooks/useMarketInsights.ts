import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';

export const useMarketInsights = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['market-insights'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('market-insights');

      if (error) throw error;
      return data;
    },
    enabled,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
};
