import { useEffect, useState } from 'react';
import { User, Session, EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '../client';
import { useToast } from '@/hooks/use-toast';
import { authRedirectPath } from '@/lib/siteUrl';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const type = params.get('type') as EmailOtpType | null;

    let cancelled = false;

    const verifyFromUrl = async () => {
      if (!token || !type) return;
      setLoading(true);
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type,
      });
      if (cancelled) return;

      if (error) {
        toast({
          title: 'Invalid or expired link',
          description: 'Please request a new password reset from the login page.',
          variant: 'destructive',
        });
        return;
      }

      params.delete('token');
      params.delete('type');
      const qs = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    };

    verifyFromUrl();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'PASSWORD_RECOVERY') {
          setIsRecovery(true);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [toast]);

  const signUp = async (email: string, password: string, metadata?: Record<string, any>): Promise<{ error: any | null }> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: authRedirectPath('/auth'),
          data: metadata || {},
        },
      });

      if (error) throw error;

      // Fire-and-forget: notify office + add to Brevo "Registered Users" list via the
      // public contact-inquiry proxy (which forwards to send-email with service-role).
      try {
        const fullName = [metadata?.first_name, metadata?.last_name]
          .filter(Boolean).join(" ") || metadata?.full_name || null;
        await supabase.functions.invoke("contact-inquiry", {
          body: {
            type: "new_registration",
            email,
            full_name: fullName,
          },
        });
      } catch (notifyErr) {
        console.warn("New-user notification failed (non-blocking):", notifyErr);
      }

      toast({
        title: "Success!",
        description: "Please check your email to verify your account before logging in.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });

      return { error: null };
    } catch (error: any) {
      const friendlyMessages: Record<string, string> = {
        'Invalid login credentials': 'Email or password incorrect. Please try again.',
        'Email not confirmed': 'Please check your email and click the confirmation link before logging in.',
      };
      toast({
        title: "Error",
        description: friendlyMessages[error.message] || error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setIsRecovery(false);

      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirectPath('/auth?mode=reset'),
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setIsRecovery(false);
      toast({
        title: "Password updated!",
        description: "Your password has been changed successfully.",
      });
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  return {
    user,
    session,
    loading,
    isRecovery,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };
};
