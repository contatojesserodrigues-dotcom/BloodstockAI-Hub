import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PremiumDialog,
  PremiumModalBody,
  PremiumModalHeader,
  PremiumModalPrimaryButton,
} from "@/components/ui/premium-modal";

interface ReportLeadGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTitle: string;
  fileUrl: string;
}

type Status = "idle" | "submitting" | "success";

const LS_KEY = "bai_registered";

export const triggerReportDownload = (url: string) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const isAlreadyRegistered = () => {
  try {
    return localStorage.getItem(LS_KEY) === "1";
  } catch {
    return false;
  }
};

export default function ReportLeadGateModal({
  open,
  onOpenChange,
  reportTitle,
  fileUrl,
}: ReportLeadGateModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    try {
      const { error: fnError } = await supabase.functions.invoke("brevo-add-contact", {
        body: { name: trimmedName, email: trimmedEmail, reportModel: reportTitle },
      });
      if (fnError) {
        console.error("Brevo submit error:", fnError);
      }
    } catch (err) {
      console.error("Brevo submit exception:", err);
    }

    try {
      localStorage.setItem(LS_KEY, "1");
    } catch {}

    setStatus("success");
    setTimeout(() => {
      triggerReportDownload(fileUrl);
      onOpenChange(false);
    }, 1000);
  };

  return (
    <PremiumDialog open={open} onOpenChange={onOpenChange} size="md">
      <PremiumModalHeader
        eyebrow="Report access"
        title="Access this Report Template"
        description="Enter your details to download instantly"
      />
      <PremiumModalBody>
        <p className="text-xs text-secondary italic truncate text-center -mt-2 mb-2">{reportTitle}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lead-name" className="text-xs uppercase tracking-wider text-muted-foreground">
              Full Name
            </Label>
            <Input
              id="lead-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              required
              disabled={status !== "idle"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-email" className="text-xs uppercase tracking-wider text-muted-foreground">
              Email Address
            </Label>
            <Input
              id="lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              disabled={status !== "idle"}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <PremiumModalPrimaryButton type="submit" disabled={status !== "idle"}>
            {status === "idle" && (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download Now
              </>
            )}
            {status === "submitting" && (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            )}
            {status === "success" && (
              <>
                <Check className="w-4 h-4 mr-2" />
                Access Granted
              </>
            )}
          </PremiumModalPrimaryButton>

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            By registering you agree to receive updates from BloodstockAI
          </p>
        </form>
      </PremiumModalBody>
    </PremiumDialog>
  );
}
