import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type LandingSectionProps = {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  dark?: boolean;
  align?: "left" | "center";
};

export const LandingSection = ({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className,
  dark = false,
  align = "center",
}: LandingSectionProps) => (
  <section
    id={id}
    className={cn(
      "relative py-20 md:py-28 lg:py-32",
      dark ? "bg-[hsl(var(--navy-deep))] text-white" : "bg-background text-foreground",
      className,
    )}
  >
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div
        className={cn(
          "max-w-3xl mb-14 md:mb-16",
          align === "center" ? "mx-auto text-center" : "text-left",
        )}
      >
        {eyebrow && (
          <p
            className={cn(
              "text-[11px] md:text-xs uppercase tracking-[0.25em] font-medium mb-4",
              dark ? "text-secondary" : "text-secondary",
            )}
          >
            {eyebrow}
          </p>
        )}
        <h2
          className={cn(
            "font-semibold tracking-tight leading-[1.08]",
            dark ? "text-white" : "text-foreground",
          )}
          style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className={cn(
              "mt-5 text-base md:text-lg font-normal leading-relaxed",
              dark ? "text-white/65" : "text-muted-foreground",
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  </section>
);
