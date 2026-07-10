import { useQuery } from '@tanstack/react-query';
import { supabase } from '../client';

export const useHorses = (searchTerm?: string) => {
  return useQuery({
    queryKey: ['horses', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('horses')
        .select('*')
        .order('name', { ascending: true });

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
};

export const useHorse = (horseId: string | undefined) => {
  return useQuery({
    queryKey: ['horse', horseId],
    queryFn: async () => {
      if (!horseId) return null;
      
      const { data, error } = await supabase
        .from('horses')
        .select('*')
        .eq('id', horseId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!horseId,
  });
};
