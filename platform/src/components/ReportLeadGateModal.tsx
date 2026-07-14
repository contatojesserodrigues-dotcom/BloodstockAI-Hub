import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0B1220] border border-[#C9A84C]/30 text-white max-w-md p-0 overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
        <div className="px-6 pt-8 pb-6 text-center border-b border-[#C9A84C]/20">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/40 flex items-center justify-center">
            <Download className="w-5 h-5 text-[#C9A84C]" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            Access this Report Template
          </h2>
          <p className="text-sm text-white/60 mt-1">
            Enter your details to download instantly
          </p>
          <p className="text-xs text-[#C9A84C]/80 mt-2 italic truncate">{reportTitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lead-name" className="text-xs uppercase tracking-wider text-white/70">
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
              className="bg-[#0F1A2E] border-[#C9A84C]/30 text-white placeholder:text-white/30 focus-visible:ring-[#C9A84C]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-email" className="text-xs uppercase tracking-wider text-white/70">
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
              className="bg-[#0F1A2E] border-[#C9A84C]/30 text-white placeholder:text-white/30 focus-visible:ring-[#C9A84C]"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={status !== "idle"}
            className="w-full bg-gradient-to-r from-[#C9A84C] to-[#E0BE5C] hover:from-[#D4B458] hover:to-[#EBC968] text-[#0B1220] font-semibold text-sm py-3 px-4 rounded-md transition-all flex items-center justify-center gap-2 disabled:opacity-90"
          >
            {status === "idle" && (
              <>
                <Download className="w-4 h-4" />
                Download Now
              </>
            )}
            {status === "submitting" && (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            )}
            {status === "success" && (
              <>
                <Check className="w-4 h-4" />
                Access Granted
              </>
            )}
          </button>

          <p className="text-[10px] text-white/40 text-center leading-relaxed">
            By registering you agree to receive updates from BloodstockAI
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}