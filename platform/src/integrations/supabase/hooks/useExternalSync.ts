import { useMutation } from '@tanstack/react-query';
import { supabase } from '../client';
import { useToast } from '@/components/ui/use-toast';

interface ExternalSyncRequest {
  horse_name: string;
}

export const useExternalSync = () => {
  const { toast } = useToast();

  const syncExternalData = useMutation({
    mutationFn: async (data: ExternalSyncRequest) => {
      const { data: result, error } = await supabase.functions.invoke('external-api-sync', {
        body: data,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "External Data Synced!",
        description: `Successfully consolidated data for ${data.horse_name} from multiple sources.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync external data",
        variant: "destructive",
      });
    },
  });

  return { syncExternalData };
};
