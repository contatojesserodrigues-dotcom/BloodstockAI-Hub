"use client";

import { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Bot, Terminal, ShieldCheck, GitBranch,
  Send, Users, Calendar, Crown, Plug, ChevronRight, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { NAV_ITEMS } from "@/lib/nav";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Building2, Bot, Terminal, ShieldCheck, GitBranch,
  Send, Users, Calendar, Crown, Plug,
};

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
      {NAV_ITEMS.map((item) => {
        const Icon = iconMap[item.icon];
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={item.href !== "/office"}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200",
              active
                ? "bg-bs-accent/15 text-white"
                : "text-bs-muted hover:bg-white/[0.04] hover:text-bs-text"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
            {active && <ChevronRight className="ml-auto h-3 w-3 opacity-40" />}
          </Link>
        );
      })}
    </nav>
  );
}

export const Sidebar = memo(function Sidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r border-bs-border bg-bs-surface/95 backdrop-blur-xl transition-transform duration-300 ease-out lg:z-40 lg:w-60 lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="border-b border-bs-border p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bs-accent shadow-lg shadow-bs-accent/20">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium tracking-tight">{BRAND.name}</p>
            <p className="text-[10px] tracking-wider uppercase text-bs-muted">{BRAND.tagline}</p>
          </div>
        </div>
      </div>

      <SidebarNav onNavigate={onNavigate} />

      <div className="border-t border-bs-border p-4">
        <p className="hidden text-[11px] text-bs-muted sm:block">{BRAND.email}</p>
        <p className="hidden text-[10px] text-white/20 sm:block">{BRAND.website}</p>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className="mt-3 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[11px] text-bs-muted transition hover:bg-white/[0.04] hover:text-bs-text"
        >
          <LogOut className="h-3 w-3" /> Sign Out
        </button>
      </div>
    </aside>
  );
});
