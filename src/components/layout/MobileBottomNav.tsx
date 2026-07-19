"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bot, Store, Workflow, Plug } from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/marketplace", label: "Market", icon: Store },
  { href: "/workflows", label: "Flows", icon: Workflow },
  { href: "/settings/integrations", label: "Connect", icon: Plug },
] as const;

export function MobileBottomNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-bs-border bg-white lg:hidden">
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
                active ? "text-bs-accent" : "text-bs-muted"
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
