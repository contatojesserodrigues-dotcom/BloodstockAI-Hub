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
          plan: (data.plan as SubscriptionStatus['plan']) ?? profilePlan,
          subscription_end: data.subscription_end ?? null,
        });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (paymentPlanId: string, billingCycle: 'monthly' | 'annual' = 'monthly') => {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { plan: paymentPlanId, billing_cycle: billingCycle },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      throw new Error('No checkout URL returned');
    } catch (error: any) {
      toast({
        title: 'Checkout Failed',
        description: error.message || 'Failed to create checkout session',
        variant: 'destructive',
      });
    }
  };

  const openCustomerPortal = async () => {
    toast({
      title: 'Manage billing',
      description: 'Contact support@agentbloodstockai.com to change or cancel your plan.',
    });
  };

  useEffect(() => {
    void checkSubscription();
    const interval = setInterval(() => { void checkSubscription(); }, 60000);
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
