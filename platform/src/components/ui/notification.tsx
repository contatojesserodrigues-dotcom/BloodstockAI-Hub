import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const notificationVariants = cva(
  "relative flex items-start gap-3 rounded-lg border p-4 transition-all duration-300 animate-fade-in",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border",
        info: "bg-blue-500/5 text-card-foreground border-blue-500/20",
        success: "bg-emerald-500/5 text-card-foreground border-emerald-500/20",
        warning: "bg-amber-500/5 text-card-foreground border-amber-500/20",
        error: "bg-destructive/5 text-card-foreground border-destructive/20",
        premium: "bg-secondary/5 text-card-foreground border-secondary/30 shadow-[var(--shadow-gold)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const iconColorMap: Record<string, string> = {
  default: "text-foreground",
  info: "text-blue-500",
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-destructive",
  premium: "text-secondary",
};

export interface NotificationProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof notificationVariants> {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: React.ReactNode;
}

const Notification = React.forwardRef<HTMLDivElement, NotificationProps>(
  ({ className, variant = "default", icon, title, description, dismissible, onDismiss, action, children, ...props }, ref) => (
    <div ref={ref} className={cn(notificationVariants({ variant }), className)} {...props}>
      {icon && (
        <div className={cn("mt-0.5 shrink-0", iconColorMap[variant || "default"])}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1">
        {title && <p className="text-sm font-semibold leading-tight">{title}</p>}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {children}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-sm p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
);
Notification.displayName = "Notification";

export { Notification, notificationVariants };
