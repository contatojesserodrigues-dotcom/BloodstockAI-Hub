"use client";

import { Menu, X } from "lucide-react";
import { KuiperLogo } from "@/components/brand/KuiperLogo";

export function MobileTopBar({
  onMenuClick,
  menuOpen,
}: {
  onMenuClick: () => void;
  menuOpen: boolean;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-bs-border bg-white/95 px-3 backdrop-blur-md sm:px-4 lg:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bs-border text-bs-text transition hover:bg-bs-surface"
      >
        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className="min-w-0 flex-1">
        <KuiperLogo variant="nav" showWordmark />
      </div>
    </header>
  );
}
