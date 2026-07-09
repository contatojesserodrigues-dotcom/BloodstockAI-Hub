"use client";

import { Building2, Menu, X } from "lucide-react";
import { BRAND } from "@/lib/brand";

export function MobileTopBar({
  onMenuClick,
  menuOpen,
}: {
  onMenuClick: () => void;
  menuOpen: boolean;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-bs-border bg-bs-surface/95 px-4 backdrop-blur-xl lg:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-bs-border text-bs-text transition hover:bg-white/[0.04]"
      >
        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bs-accent shadow-lg shadow-bs-accent/20">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium tracking-tight">{BRAND.name}</p>
          <p className="truncate text-[10px] uppercase tracking-wider text-bs-muted">Virtual HUB</p>
        </div>
      </div>
    </header>
  );
}
