import Image from "next/image";
import { BRAND } from "@/lib/brand";

type LogoVariant = "mark" | "hero" | "nav";

const VARIANT_SIZE: Record<LogoVariant, { base: number; sm?: number; className: string }> = {
  mark: { base: 40, className: "h-10 w-10 sm:h-11 sm:w-11" },
  nav: { base: 48, className: "h-11 w-11 sm:h-12 sm:w-12" },
  hero: { base: 160, className: "h-28 w-28 sm:h-36 sm:w-36 md:h-44 md:w-44" },
};

export function KuiperLogo({
  size,
  className = "",
  showWordmark = false,
  variant = "mark",
  priority = false,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  variant?: LogoVariant;
  priority?: boolean;
}) {
  const preset = VARIANT_SIZE[variant];
  const px = size ?? preset.base;
  const src = variant === "hero" ? BRAND.logoLg : BRAND.logo;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src={src}
        alt={BRAND.name}
        width={px}
        height={px}
        priority={priority || variant === "hero"}
        className={`object-contain drop-shadow-md ${size ? "" : preset.className}`}
        style={size ? { width: size, height: size } : undefined}
      />
      {showWordmark && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-bs-text sm:text-[15px]">
            {BRAND.name}
          </p>
          <p className="truncate text-[10px] tracking-wider uppercase text-bs-muted sm:text-[11px]">
            {BRAND.tagline}
          </p>
        </div>
      )}
    </div>
  );
}
