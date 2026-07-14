import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

interface PDFDownloadGuardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PDFDownloadGuard = ({ open, onOpenChange }: PDFDownloadGuardProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden border-0" style={{ backgroundColor: '#0B0B0D', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="p-6 space-y-4 text-center">
          <div className="flex justify-center">
            <img src={logo} alt="BloodstockAI" className="h-10 w-auto object-contain" />
          </div>

          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(212,175,55,0.1)' }}>
            <FileDown className="w-6 h-6" style={{ color: '#D4AF37' }} />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold" style={{ color: '#FFFFFF', fontFamily: "'Cinzel', Georgia, serif" }}>
              🐎 Upgrade to Download
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#CFCFCF' }}>
              PDF reports are available on paid plans. Upgrade now to download professional bloodstock reports.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              className="w-full border-0 font-bold"
              onClick={() => { onOpenChange(false); navigate("/pricing"); }}
              style={{ backgroundColor: '#D4AF37', color: '#0B0B0D', fontFamily: "'Cinzel', Georgia, serif" }}
            >
              Upgrade Now →
            </Button>
            <button
              onClick={() => onOpenChange(false)}
              className="w-full text-center text-sm cursor-pointer bg-transparent border-none py-2"
              style={{ color: '#666' }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
