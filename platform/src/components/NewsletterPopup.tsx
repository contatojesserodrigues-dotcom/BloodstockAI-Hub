import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { z } from "zod";
import {
  PremiumDialog,
  PremiumModalBody,
  PremiumModalHeader,
  PremiumModalPrimaryButton,
  PremiumModalSecondaryButton,
  PremiumModalDismiss,
  PremiumModalFooterNote,
} from "@/components/ui/premium-modal";

const DISMISSED_KEY = "bsai_newsletter_dismissed_v1";
const SUBSCRIBED_KEY = "bsai_newsletter_subscribed_v1";
const SHOW_DELAY_MS = 8000;
const emailSchema = z.string().trim().email().max(255);

export const NewsletterPopup = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const isEligible = useCallback(() => {
    if (typeof window === "undefined") return false;
    if (user) return false;
    if (localStorage.getItem(DISMISSED_KEY)) return false;
    if (localStorage.getItem(SUBSCRIBED_KEY)) return false;
    return true;
  }, [user]);

  useEffect(() => {
    const handler = () => {
      if (user) return;
      if (localStorage.getItem(SUBSCRIBED_KEY)) return;
      setOpen(true);
    };
    window.addEventListener("open-newsletter-popup", handler);
    return () => window.removeEventListener("open-newsletter-popup", handler);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!isEligible()) return;

    const timer = window.setTimeout(() => {
      if (isEligible()) setOpen(true);
    }, SHOW_DELAY_MS);

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && isEligible()) {
        setOpen(true);
      }
    };
    document.addEventListener("mouseleave", onMouseLeave);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [authLoading, isEligible]);

  const close = (markDismissed: boolean) => {
    setOpen(false);
    if (markDismissed) {
      try { localStorage.setItem(DISMISSED_KEY, new Date().toISOString()); } catch { /* noop */ }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("contact-inquiry", {
        body: {
          email: parsed.data,
          type: "newsletter",
          source: typeof window !== "undefined" ? window.location.pathname : "popup",
          _hp: honeypot,
        },
      });
      if (error) throw error;
      try { localStorage.setItem(SUBSCRIBED_KEY, new Date().toISOString()); } catch { /* noop */ }
      window.dispatchEvent(new Event("newsletter-subscribed"));
      toast({ title: "You're in.", description: "First insights coming soon." });
      setOpen(false);
    } catch {
      toast({ title: "Subscription failed", description: "Please try again later.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const goToRegister = () => {
    close(true);
    navigate("/register");
  };

  return (
    <PremiumDialog open={open} onOpenChange={(v) => !v && close(true)} size="md">
      <PremiumModalHeader
        eyebrow="Newsletter"
        title="Make the next decision your best one."
        description="Weekly pedigree, market and Training Analysis insights — free."
        showLogo
      />
      <PremiumModalBody>
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30">
            <Clock className="w-3 h-3 text-red-500" />
            <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wider">
              Limited time: 3 months free on Annual Plan
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
          <Mail className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Get the sale intelligence professionals use to identify upside earlier, reduce expensive
            mistakes and act with confidence.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true">
            <input
              name="fax_number"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
            />
          </div>
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PremiumModalPrimaryButton type="submit" size="lg" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Get Decision Intelligence
          </PremiumModalPrimaryButton>
        </form>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full h-px bg-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-white text-[10px] font-medium text-muted-foreground uppercase tracking-[0.2em]">
              or
            </span>
          </div>
        </div>

        <PremiumModalSecondaryButton size="lg" onClick={goToRegister}>
          Explore the Platform Free
        </PremiumModalSecondaryButton>

        <PremiumModalDismiss onClick={() => close(true)}>Maybe Later</PremiumModalDismiss>
        <PremiumModalFooterNote>No spam. Unsubscribe anytime.</PremiumModalFooterNote>
      </PremiumModalBody>
    </PremiumDialog>
  );
};

export default NewsletterPopup;
