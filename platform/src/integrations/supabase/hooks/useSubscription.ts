import { useEffect, useState } from 'react';
import { supabase } from '../client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionStatus {
  subscribed: boolean;
  plan: 'basic' | 'pro' | 'enterprise';
  subscription_end: string | null;
}

export const useSubscription = (userId: string | undefined) => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    plan: 'basic',
    subscription_end: null,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // TEMPORARILY DISABLED - Stripe key invalid
  const checkSubscription = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Stripe check disabled - just set loading to false
    setLoading(false);
    
    // try {
    //   const { data, error } = await supabase.functions.invoke('check-subscription');
    //
    //   if (error) throw error;
    //
    //   if (data) {
    //     setStatus({
    //       subscribed: data.subscribed,
    //       plan: data.plan,
    //       subscription_end: data.subscription_end,
    //     });
    //   }
    // } catch (error) {
    //   console.error('Error checking subscription:', error);
    // } finally {
    //   setLoading(false);
    // }
  };

  const createCheckout = async (priceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Redirecting to Checkout",
          description: "Opening Stripe checkout in a new tab...",
        });
      }
    } catch (error: any) {
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Opening Billing Portal",
          description: "Manage your subscription in Stripe...",
        });
      }
    } catch (error: any) {
      toast({
        title: "Portal Failed",
        description: error.message || "Failed to open customer portal",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkSubscription();

    // Check subscription every 60 seconds
    const interval = setInterval(() => {
      checkSubscription();
    }, 60000);

    return () => clearInterval(interval);
  }, [userId]);

  return {
    ...status,
    loading,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
};
