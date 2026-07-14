import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, Menu, X, Activity, Crosshair, Camera, Timer, Zap, Dna, Globe, Heart, LineChart, Tablet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageLoader } from "@/components/PageLoader";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import wordmark from "@/assets/bloodstockai-wordmark-menu-transparent.png";
import { BillingCard } from "@/components/dashboard/BillingCard";
import { WelcomeModal } from "@/components/WelcomeModal";

import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useProfile } from "@/integrations/supabase/hooks/useProfile";
import { useCredits } from "@/hooks/useCredits";
import { useUserRole } from "@/hooks/useUserRole";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

const DashboardUpload = lazy(() => import("@/components/dashboard/DashboardUpload").then((m) => ({ default: m.DashboardUpload })));
const DashboardSearch = lazy(() => import("@/components/dashboard/DashboardSearch").then((m) => ({ default: m.DashboardSearch })));
const DashboardMatings = lazy(() => import("@/components/dashboard/DashboardMatings").then((m) => ({ default: m.DashboardMatings })));
const DashboardMarket = lazy(() => import("@/components/dashboard/DashboardMarket").then((m) => ({ default: m.DashboardMarket })));
const DashboardReports = lazy(() => import("@/components/dashboard/DashboardReports").then((m) => ({ default: m.DashboardReports })));
const DashboardPerformance = lazy(() => import("@/components/dashboard/DashboardPerformance").then((m) => ({ default: m.DashboardPerformance })));
const StallionFinderPanel = lazy(() => import("@/components/dashboard/StallionFinderPanel").then((m) => ({ default: m.StallionFinderPanel })));
const DashboardVisualAnalysis = lazy(() => import("@/components/dashboard/DashboardVisualAnalysis"));
const DashboardVisualAnalysisLegacy = lazy(() => import("@/components/dashboard/DashboardVisualAnalysisLegacy").then((m) => ({ default: m.DashboardVisualAnalysisLegacy })));
const DashboardBreezeUp = lazy(() => import("@/components/dashboard/DashboardBreezeUp").then((m) => ({ default: m.DashboardBreezeUp })));
const DashboardSettings = lazy(() => import("@/components/dashboard/DashboardSettings").then((m) => ({ default: m.DashboardSettings })));
const DashboardActionCatalog = lazy(() => import("@/components/dashboard/DashboardActionCatalog").then((m) => ({ default: m.DashboardActionCatalog })));
const DashboardTraining = lazy(() => import("@/components/dashboard/DashboardTraining").then((m) => ({ default: m.DashboardTraining })));
const DashboardBroodmarePlanning = lazy(() => import("@/components/dashboard/DashboardBroodmarePlanning").then((m) => ({ default: m.DashboardBroodmarePlanning })));

type TabType = "upload" | "search" | "performance" | "matings" | "broodmare" | "broodmare-planning" | "stallion-finder" | "market" | "chat" | "reports" | "settings" | "visual-analysis" | "visual-analysis-classic" | "breezeup" | "action-catalog" | "training";

const MENU_ITEMS: { id: TabType; icon: typeof Zap; label: string }[] = [
  { id: "action-catalog", icon: Zap, label: "Dashboard" },
  { id: "upload", icon: FileText, label: "Pedigree / PDF Analysis" },
  { id: "breezeup", icon: Timer, label: "Breeze-Up/HIT Analysis" },
  { id: "visual-analysis", icon: Tablet, label: "Sale Inspection Analysis" },
  { id: "visual-analysis-classic", icon: Camera, label: "Visual Analysis" },
  { id: "training", icon: LineChart, label: "Training Analysis" },
  { id: "performance", icon: Activity, label: "Performance Analysis" },
  { id: "stallion-finder", icon: Crosshair, label: "Stallion Finder" },
  { id: "matings", icon: Dna, label: "Matings Plan" },
  { id: "broodmare", icon: Heart, label: "Broodmare Planning" },
  { id: "market", icon: Globe, label: "Market Update" },
];

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabType) || "action-catalog";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { isPaidPlan } = useCredits();
  const { isFreeUser, isSuperAdmin } = useUserRole();
  const access = useFeatureAccess();

  const { toast } = useToast();
  const welcomeShown = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && searchParams.get("welcome") === "true" && !welcomeShown.current) {
      welcomeShown.current = true;
      toast({
        title: "Welcome to BloodstockAI®!",
        description: "Your account is confirmed. Explore the platform and discover our plans.",
      });
    }
  }, [user, searchParams, toast]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const allMenuItems = MENU_ITEMS;

  if (loading || !user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8FAFC]">
        <PageLoader label="Loading dashboard…" />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "reports": return <DashboardReports />;
      case "upload": return <DashboardUpload />;
      case "breezeup": return <DashboardBreezeUp />;
      case "visual-analysis": return <DashboardVisualAnalysis />;
      case "visual-analysis-classic": return <DashboardVisualAnalysisLegacy />;
      case "training": return <DashboardTraining />;
      case "search": return <DashboardSearch />;
      case "performance": return <DashboardPerformance />;
      case "matings": return <DashboardMatings />;
      case "stallion-finder": return <StallionFinderPanel />;
      case "broodmare": return <DashboardBroodmarePlanning />;
      case "broodmare-planning": return <DashboardBroodmarePlanning />;
      case "market": return <DashboardMarket />;
      case "settings": return <DashboardSettings />;
      case "action-catalog": return <DashboardActionCatalog />;
      default: return <DashboardActionCatalog />;
    }
  };

  return (
    <div className="dashboard-light min-h-[100dvh] bg-[#F8FAFC] flex flex-col lg:flex-row w-full">
      <WelcomeModal userId={user?.id} />
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed lg:relative lg:translate-x-0 z-50 h-[100dvh] lg:h-auto lg:min-h-[100dvh] bg-white border-r border-border/50 transition-transform duration-300 flex flex-col w-60 shrink-0 shadow-[inset_-1px_0_0_rgba(15,23,42,0.04)]`}
      >
        <div className="px-4 py-4 border-b border-border/40 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={wordmark} alt="BloodstockAI®" className="h-7 w-auto object-contain" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-muted/50 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overscroll-contain">
          {allMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-[13px] ${
                  isActive
                    ? "bg-[#0F172A] text-white font-medium shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Icon className="w-[15px] h-[15px] flex-shrink-0 stroke-[1.5]" />
                <span className="truncate text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {!isPaidPlan && !isSuperAdmin && (
          <div className="px-3 pb-2">
            <div className="bg-muted/50 rounded-lg p-3 border border-border text-center">
              <p className="text-[10px] text-muted-foreground mb-2">
                Subscribe to unlock all features and unlimited analyses.
              </p>
              <Button variant="premium" size="sm" className="w-full text-xs h-7" onClick={() => navigate("/pricing")}>
                View Plans
              </Button>
            </div>
          </div>
        )}

        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={() => handleTabChange("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
              activeTab === "settings"
                ? "bg-secondary/10 text-secondary font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span>Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 min-h-0 w-full">
        <header className="bg-white/90 backdrop-blur-md border-b border-border/50 px-3 sm:px-4 lg:px-6 py-3 sticky top-0 z-30 shadow-[0_1px_0_rgba(15,23,42,0.04)] shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-muted/50 rounded-lg transition-colors flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-base font-semibold text-foreground truncate tracking-[-0.02em]">
                {allMenuItems.find((item) => item.id === activeTab)?.label || activeTab}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 hidden sm:block tracking-[0.08em] uppercase">
                Professional bloodstock intelligence
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Button variant="outline" size="sm" className="text-[11px] sm:text-xs h-8 sm:h-9" onClick={() => navigate("/pricing")}>
                {isPaidPlan || isSuperAdmin ? "Manage Plan" : "View Plans"}
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6">
          <div className="max-w-[1600px] mx-auto">
            <ErrorBoundary variant="inline" resetKey={activeTab}>
              <Suspense fallback={<PageLoader label="Loading module…" />}>
              {activeTab === "settings" ? (
                <div className="max-w-3xl">{renderContent()}</div>
              ) : activeTab === "visual-analysis" || activeTab === "visual-analysis-classic" ? (
                <div className="min-w-0">{renderContent()}</div>
              ) : activeTab === "action-catalog" ? (
                <div className="space-y-4 md:space-y-6">
                  <div className="min-w-0">{renderContent()}</div>
                  <div className="max-w-md">
                    <BillingCard />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 md:space-y-6">
                  <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
                    <div className="min-w-0 lg:col-span-2">{renderContent()}</div>
                    <div className="lg:col-span-1 space-y-4">
                      <BillingCard />
                    </div>
                  </div>
                </div>
              )}
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}
