"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Bot, Terminal, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/office", label: "Office", icon: Building2 },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/terminal", label: "Terminal", icon: Terminal },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck },
] as const;

export function MobileBottomNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-bs-border bg-bs-surface/95 backdrop-blur-xl lg:hidden">
      <div
        className="grid grid-cols-5 gap-1 px-2 pt-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] transition",
                active ? "text-bs-accent-light" : "text-bs-muted"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-bs-accent")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
