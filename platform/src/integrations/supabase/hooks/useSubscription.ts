import { useEffect, useState } from 'react';
import { supabase } from '../client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionStatus {
  subscribed: boolean;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  subscription_end: string | null;
}

export const useSubscription = (userId: string | undefined) => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    plan: 'free',
    subscription_end: null,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const checkSubscription = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('user_id', userId)
        .maybeSingle();

      const profilePlan = (profile?.plan as SubscriptionStatus['plan']) ?? 'free';
      const isPaid = ['starter', 'pro', 'enterprise'].includes(profilePlan);

      setStatus((prev) => ({
        ...prev,
        plan: profilePlan,
        subscribed: isPaid,
      }));

      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (!error && data) {
        setStatus({
          subscribed: data.subscribed ?? isPaid,
          plan: data.plan ?? profilePlan,
          subscription_end: data.subscription_end ?? null,
        });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (params: {
    planId: string;
    billingCycle: 'monthly' | 'annual';
    currency: string;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error('No checkout URL returned');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create checkout';
      toast({
        title: 'Checkout Failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to open billing portal';
      toast({
        title: 'Portal Failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    checkSubscription();

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
