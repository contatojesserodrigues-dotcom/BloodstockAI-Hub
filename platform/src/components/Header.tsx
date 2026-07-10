import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navLinkClass } from "@/lib/cn-nav";
import wordmark from "@/assets/bloodstockai-wordmark-menu.png";

const NAV_ITEMS = [
  { label: "Platform", to: "/dashboard" },
  { label: "Inspection", to: "/#inspection-showcase" },
  { label: "Pedigree", to: "/dashboard?tab=performance" },
  { label: "Market Reports", to: "/reports" },
  { label: "Pricing", to: "/pricing" },
  { label: "Advisory", to: "/advisory" },
] as const;

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border/40 shadow-[0_1px_0_hsl(var(--border)/0.5)]"
          : "bg-background/80 backdrop-blur-sm border-b border-transparent",
      )}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 md:h-[76px] items-center justify-between gap-4">
          <Link to="/" className="flex items-center shrink-0" aria-label="BloodstockAI home">
            <img
              src={wordmark}
              alt="BloodstockAI"
              className="h-[22px] w-auto object-contain sm:h-7 lg:h-8"
            />
          </Link>

          <nav className="hidden xl:flex items-center gap-6 2xl:gap-8">
            <Link to={NAV_ITEMS[0].to} className={cn(navLinkClass(), "group")}>
              {NAV_ITEMS[0].label}
            </Link>
            <div className="group/sales relative">
              <button
                type="button"
                className={cn(navLinkClass(), "flex items-center gap-1 py-6")}
                aria-haspopup="menu"
              >
                Sales
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover/sales:rotate-180 group-focus-within/sales:rotate-180" />
              </button>
              <div className="invisible absolute left-1/2 top-[calc(100%-10px)] z-50 w-60 -translate-x-1/2 translate-y-2 rounded-xl border border-border/60 bg-white p-2 opacity-0 shadow-[var(--shadow-premium)] transition-all group-hover/sales:visible group-hover/sales:translate-y-0 group-hover/sales:opacity-100 group-focus-within/sales:visible group-focus-within/sales:translate-y-0 group-focus-within/sales:opacity-100">
                <Link to="/horses-for-sale" className="block rounded-lg px-3 py-2.5 text-sm font-bold text-foreground hover:bg-muted/60">
                  Horses for Sale
                  <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">Private sales and live offers</span>
                </Link>
                <Link to="/sales-catalogs" className="block rounded-lg px-3 py-2.5 text-sm font-bold text-foreground hover:bg-muted/60">
                  Sales Catalogs Analyzed
                  <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">Lot-by-lot decision intelligence</span>
                </Link>
              </div>
            </div>
            {NAV_ITEMS.slice(1).map(({ label, to }) => (
              <Link key={label} to={to} className={cn(navLinkClass(), "group")}>
                {label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-[13px] font-normal text-muted-foreground">
                Login
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                variant="outline"
                size="sm"
                className="text-[13px] font-normal border-border/70 hover:border-secondary/40 hover:bg-secondary/5"
              >
                Book a Demo
              </Button>
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-border/40 bg-background/95 backdrop-blur-md animate-fade-in">
          <nav className="mx-auto max-w-[1400px] px-4 py-4 flex flex-col gap-1">
            <Link
              to={NAV_ITEMS[0].to}
              className="px-3 py-2.5 text-[15px] font-normal text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {NAV_ITEMS[0].label}
            </Link>
            <div className="my-1 rounded-xl border border-border/50 bg-muted/20 p-1.5">
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Sales</p>
              <Link
                to="/horses-for-sale"
                className="block rounded-lg px-2 py-2 text-[15px] font-bold text-foreground hover:bg-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Horses for Sale
              </Link>
              <Link
                to="/sales-catalogs"
                className="block rounded-lg px-2 py-2 text-[15px] font-bold text-foreground hover:bg-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sales Catalogs Analyzed
              </Link>
            </div>
            {NAV_ITEMS.slice(1).map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="px-3 py-2.5 text-[15px] font-normal text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-border/40">
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-center">
                  Login
                </Button>
              </Link>
              <Link to="/contact" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full justify-center">
                  Book a Demo
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
