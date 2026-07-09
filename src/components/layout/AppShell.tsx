"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen((open) => !open), []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="min-h-screen bg-bs-bg">
      <MobileTopBar onMenuClick={toggleMobile} menuOpen={mobileOpen} />

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      <Sidebar mobileOpen={mobileOpen} onNavigate={closeMobile} />

      <main className="min-h-screen pt-14 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-60 lg:pt-0">
        <div className="bs-container py-4 sm:py-6 lg:py-8">{children}</div>
      </main>

      <MobileBottomNav onNavigate={closeMobile} />
    </div>
  );
}
