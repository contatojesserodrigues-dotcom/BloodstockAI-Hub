import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Send } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  PremiumDialog,
  PremiumModalBody,
  PremiumModalHeader,
  PremiumModalPrimaryButton,
  PremiumModalSecondaryButton,
} from "@/components/ui/premium-modal";

const inquirySchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  companyName: z.string().trim().min(2, "Company name must be at least 2 characters").max(150),
  email: z.string().trim().email("Please enter a valid email address").max(255),
});

interface PlanInquiryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName?: string;
}

export const PlanInquiryModal = ({ open, onOpenChange, planName }: PlanInquiryModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ fullName: "", companyName: "", email: "" });
  const [honeypot, setHoneypot] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Honeypot check
    if (honeypot) return;

    const result = inquirySchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("contact-inquiry", {
        body: {
          full_name: result.data.fullName,
          company_name: result.data.companyName,
          email: result.data.email,
          plan_interest: planName || "General",
          _hp: honeypot,
        },
      });

      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast({
        title: "Submission failed",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setForm({ fullName: "", companyName: "", email: "" });
      setErrors({});
      setSubmitted(false);
      setHoneypot("");
    }
    onOpenChange(val);
  };

  return (
    <PremiumDialog open={open} onOpenChange={handleClose} size="md" className="sm:max-w-[500px]">
      {submitted ? (
        <PremiumModalBody className="flex flex-col items-center text-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-secondary" />
          </div>
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Thank You</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Thank you. Our team will contact you shortly.
          </p>
          <PremiumModalSecondaryButton onClick={() => handleClose(false)}>Close</PremiumModalSecondaryButton>
        </PremiumModalBody>
      ) : (
        <>
          <PremiumModalHeader
            eyebrow="Plans"
            title={planName ? `Get ${planName}` : "Get Your Plan"}
            description="Fill in your details and our team will set up your account within 24 hours."
          />
          <PremiumModalBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot - hidden from real users */}
              <div className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={e => setHoneypot(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="John Smith"
                  value={form.fullName}
                  onChange={e => handleChange("fullName", e.target.value)}
                  className={errors.fullName ? "border-destructive" : ""}
                />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company / Stud Farm *</Label>
                <Input
                  id="companyName"
                  placeholder="Coolmore Stud"
                  value={form.companyName}
                  onChange={e => handleChange("companyName", e.target.value)}
                  className={errors.companyName ? "border-destructive" : ""}
                />
                {errors.companyName && <p className="text-xs text-destructive">{errors.companyName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={e => handleChange("email", e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <PremiumModalPrimaryButton type="submit" className="flex-1" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Submit
                </PremiumModalPrimaryButton>
                <PremiumModalSecondaryButton type="button" className="flex-1" onClick={() => handleClose(false)}>
                  Cancel
                </PremiumModalSecondaryButton>
              </div>
            </form>
          </PremiumModalBody>
        </>
      )}
    </PremiumDialog>
  );
};
