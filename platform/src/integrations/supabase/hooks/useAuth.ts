import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../client';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
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

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, any>): Promise<{ error: any | null }> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
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
        redirectTo: `${window.location.origin}/auth`,
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
