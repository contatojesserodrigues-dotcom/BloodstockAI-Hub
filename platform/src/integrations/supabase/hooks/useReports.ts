import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../client';
import { useToast } from '@/components/ui/use-toast';

export interface PublishedReport {
  id: string;
  title: string;
  description: string | null;
  report_type: string;
  pdf_url: string;
  cover_image_url: string | null;
  price: number;
  published_at: string;
  auction_house: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportPurchase {
  id: string;
  user_id: string;
  report_id: string;
  purchased_at: string;
  price_paid: number;
}

export const usePublishedReports = (filters?: {
  searchQuery?: string;
  reportType?: string;
  auctionHouse?: string;
  paidOnly?: boolean;
  freeOnly?: boolean;
}) => {
  return useQuery({
    queryKey: ['published-reports', filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('published_reports')
        .select('*')
        .order('published_at', { ascending: false });

      if (filters?.searchQuery) {
        const sanitized = filters.searchQuery.replace(/[(),."'\\%_]/g, '').trim().slice(0, 100);
        if (sanitized) {
          query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
        }
      }

      if (filters?.reportType) {
        query = query.eq('report_type', filters.reportType);
      }

      if (filters?.auctionHouse) {
        query = query.eq('auction_house', filters.auctionHouse);
      }

      if (filters?.paidOnly) {
        query = query.gt('price', 0);
      }

      if (filters?.freeOnly) {
        query = query.or('price.eq.0,price.is.null');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PublishedReport[];
    },
  });
};

export const useUserPurchases = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['report-purchases', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await (supabase as any)
        .from('report_purchases')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data as ReportPurchase[];
    },
    enabled: !!userId,
  });
};

export const usePurchaseReport = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ reportId, price }: { reportId: string; price: number }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');

      // Route through edge function which verifies payment before creating purchase
      const { data, error } = await supabase.functions.invoke('purchase-report', {
        body: { report_id: reportId, price },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Purchase Successful!",
        description: "Your report is now available for download.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase report",
        variant: "destructive",
      });
    },
  });
};
