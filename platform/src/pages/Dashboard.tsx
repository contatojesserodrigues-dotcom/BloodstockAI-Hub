import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, Search, Dna, Heart, TrendingUp, Settings, LogOut, Menu, X, MessageSquare, Activity, Crosshair, Camera, Timer, Zap, FileText, Globe, LineChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import wordmark from "@/assets/bloodstockai-wordmark-menu-transparent.png";
import { DashboardChat } from "@/components/dashboard/DashboardChat";
import { DashboardUpload } from "@/components/dashboard/DashboardUpload";
import { DashboardSearch } from "@/components/dashboard/DashboardSearch";
import { DashboardMatings } from "@/components/dashboard/DashboardMatings";
import { DashboardBroodmare } from "@/components/dashboard/DashboardBroodmare";
import { DashboardMarket } from "@/components/dashboard/DashboardMarket";
import { DashboardReports } from "@/components/dashboard/DashboardReports";
import { DashboardPerformance } from "@/components/dashboard/DashboardPerformance";
import { StallionFinderPanel } from "@/components/dashboard/StallionFinderPanel";
import { DashboardVisualAnalysis } from "@/components/dashboard/DashboardVisualAnalysis";
import { DashboardVisualAnalysisLegacy } from "@/components/dashboard/DashboardVisualAnalysisLegacy";
import { DashboardBreezeUp } from "@/components/dashboard/DashboardBreezeUp";
import { DashboardSettings } from "@/components/dashboard/DashboardSettings";
import { DashboardActionCatalog } from "@/components/dashboard/DashboardActionCatalog";
import { DashboardTraining } from "@/components/dashboard/DashboardTraining";
import { DashboardBroodmarePlanning } from "@/components/dashboard/DashboardBroodmarePlanning";
import { Tablet } from "lucide-react";

import { BillingCard } from "@/components/dashboard/BillingCard";
import { WelcomeModal } from "@/components/WelcomeModal";

import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useProfile } from "@/integrations/supabase/hooks/useProfile";
import { useCredits } from "@/hooks/useCredits";
import { useUserRole } from "@/hooks/useUserRole";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

type TabType = "upload" | "search" | "performance" | "matings" | "broodmare" | "broodmare-planning" | "stallion-finder" | "market" | "chat" | "reports" | "settings" | "visual-analysis" | "visual-analysis-classic" | "breezeup" | "action-catalog" | "training";

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

  // Welcome toast for first-time confirmed users
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const allMenuItems = [
    { id: "action-catalog" as TabType, icon: Zap, label: "Dashboard" },
    { id: "upload" as TabType, icon: FileText, label: "Upload a Single PDF" },
    { id: "breezeup" as TabType, icon: Timer, label: "Breeze-Up/HIT Analysis" },
    { id: "visual-analysis" as TabType, icon: Tablet, label: "Sale Inspection Analysis" },
    { id: "visual-analysis-classic" as TabType, icon: Camera, label: "Visual Analysis" },
    { id: "training" as TabType, icon: LineChart, label: "Training Analysis" },
    // { id: "search" as TabType, icon: Search, label: "Horse Search" }, // hidden
    { id: "performance" as TabType, icon: Activity, label: "Performance Analysis" },
    { id: "stallion-finder" as TabType, icon: Crosshair, label: "Stallion Finder" },
    { id: "matings" as TabType, icon: Dna, label: "Matings Plan" },
    { id: "broodmare" as TabType, icon: Heart, label: "Broodmare Planning" },
    { id: "market" as TabType, icon: Globe, label: "Market Update" },
    { id: "reports" as TabType, icon: TrendingUp, label: "Weekly Reports" },
  ];

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
    <div className="dashboard-light min-h-screen bg-[#F8FAFC] flex overflow-x-hidden">
      <WelcomeModal userId={user?.id} />
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed lg:relative lg:translate-x-0 z-50 h-screen max-h-[100dvh] bg-white border-r border-border/50 transition-transform duration-300 flex flex-col w-60 shadow-[inset_-1px_0_0_rgba(15,23,42,0.04)]`}
      >
        <div className="px-4 py-4 border-b border-border/40 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img
              src={wordmark}
              alt="BloodstockAI®"
              className="h-7 w-auto object-contain"
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
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
                {Icon ? (
                  <Icon className="w-[15px] h-[15px] flex-shrink-0 stroke-[1.5]" />
                ) : null}
                <span className="truncate text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Upgrade CTA for unpaid users */}
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full min-w-0">
        <header className="bg-white/90 backdrop-blur-md border-b border-border/50 px-3 sm:px-4 lg:px-6 py-3 sticky top-0 z-30 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-muted/50 rounded-lg transition-colors flex-shrink-0"
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

        <div className="p-3 sm:p-4 md:p-6">
          <div className="max-w-[1600px] mx-auto">
            {activeTab === "settings" ? (
              <div className="max-w-3xl">
                {renderContent()}
              </div>
            ) : activeTab === "visual-analysis" || activeTab === "visual-analysis-classic" ? (
              <div className="min-w-0">
                {renderContent()}
              </div>
            ) : activeTab === "action-catalog" ? (
              <div className="space-y-4 md:space-y-6">
                <div className="min-w-0">
                  {renderContent()}
                </div>
                <div className="max-w-md">
                  <BillingCard />
                </div>
              </div>
            ) : (
              <div className="space-y-4 md:space-y-6">
                <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
                  <div className="min-w-0 lg:col-span-2">
                    {renderContent()}
                  </div>
                  <div className="lg:col-span-1 space-y-4">
                    <BillingCard />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
