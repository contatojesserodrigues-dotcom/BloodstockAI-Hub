import Link from "next/link";
import { BrandFooter } from "@/components/brand/BrandFooter";
import { KuiperLogo } from "@/components/brand/KuiperLogo";
import { BRAND } from "@/lib/brand";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-bs-border">
        <div className="bs-container flex flex-wrap items-center justify-between gap-3 py-4">
          <KuiperLogo variant="nav" showWordmark />
          <Link href="/login" className="bs-btn-ghost text-sm">
            Sign in
          </Link>
        </div>
      </header>
      <main className="bs-container max-w-3xl py-8 sm:py-12">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-bs-muted">{BRAND.name}</p>
        {children}
      </main>
      <footer className="border-t border-bs-border">
        <div className="bs-container py-6">
          <BrandFooter />
        </div>
      </footer>
    </div>
  );
}
