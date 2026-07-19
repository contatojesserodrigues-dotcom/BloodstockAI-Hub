import Link from "next/link";
import { BRAND } from "@/lib/brand";

const LINKS = [
  { href: "/legal/terms", label: "Terms of Use" },
  { href: "/legal/license", label: "License Terms" },
  { href: "/legal/usage", label: "Usage Policy" },
  { href: "/legal/privacy", label: "Privacy Policy" },
];

export function BrandFooter({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-[11px] leading-relaxed text-bs-muted">{BRAND.footer}</p>
      <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-bs-accent hover:underline">
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
