import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

export const premiumModalContentClass =
  "border border-border/60 p-0 overflow-hidden max-h-[90vh] overflow-y-auto bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)]";

type PremiumDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
};

export function PremiumDialog({
  open,
  onOpenChange,
  children,
  className,
  size = "md",
}: PremiumDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(premiumModalContentClass, sizeMap[size], className)}>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function PremiumModalHeader({
  title,
  description,
  eyebrow,
  showLogo = true,
  invertLogo = true,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: string;
  showLogo?: boolean;
  invertLogo?: boolean;
}) {
  return (
    <div className="relative bg-gradient-to-br from-[#0F172A] via-[#111827] to-[#1E293B] px-5 sm:px-6 py-6 sm:py-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,138,43,0.18),transparent_55%)] pointer-events-none" />
      <div className="relative space-y-3 text-center">
        {showLogo && (
          <img
            src={logo}
            alt="BloodstockAI"
            className={cn("h-9 sm:h-10 w-auto mx-auto object-contain", invertLogo && "brightness-0 invert")}
          />
        )}
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#C58A2B]">{eyebrow}</p>
        )}
        <h2 className="text-lg sm:text-xl font-semibold tracking-[-0.03em] text-white">{title}</h2>
        {description && <p className="text-sm leading-relaxed text-white/65 max-w-md mx-auto">{description}</p>}
      </div>
    </div>
  );
}

export function PremiumModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-5 sm:px-6 py-5 sm:py-6 space-y-4", className)}>{children}</div>;
}

export function PremiumModalHighlight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border-2 border-secondary/30 bg-secondary/5 p-4 sm:p-5 space-y-3", className)}>
      {children}
    </div>
  );
}

export function PremiumModalSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">{children}</p>
  );
}

export function PremiumModalFeatureGrid({
  items,
}: {
  items: Array<{ icon: React.ComponentType<{ className?: string }>; title: string; desc: string }>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 space-y-1.5"
          >
            <Icon className="w-4 h-4 text-secondary" />
            <p className="text-xs font-semibold text-foreground leading-snug">{item.title}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{item.desc}</p>
          </div>
        );
      })}
    </div>
  );
}

export function PremiumModalPrimaryButton({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn("w-full bg-[#0F172A] hover:bg-[#111827] text-white font-semibold", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export function PremiumModalSecondaryButton({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      className={cn("w-full border-secondary/30 text-secondary hover:bg-secondary/5 hover:text-secondary", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export function PremiumModalDismiss({
  children,
  onClick,
}: {
  children?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
    >
      {children ?? "Maybe Later"}
    </button>
  );
}

export function PremiumModalFooterNote({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-[11px] text-muted-foreground">{children}</p>;
}

/** @deprecated Use PremiumDialog + PremiumModalHeader instead */
export const PremiumModal = PremiumDialog;
