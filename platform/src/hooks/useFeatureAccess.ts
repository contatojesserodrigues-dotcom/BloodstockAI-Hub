import { useCredits } from "@/hooks/useCredits";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Feature access rules:
 * - Free plan (3 analyses): Horse Search, Stallion Search, Performance (read-only)
 *   NO: PDF upload, catalogue, matings, broodmare, visual, breeze-up, reports, PDF download
 * - Starter ($99/mo): 100 analyses, unlimited single PDF uploads, matings, reports
 *   NO: Catalogue, Broodmare, Visual, Breeze-Up
 * - Pro ($399/mo): Everything — 1,000 analyses, 2 catalogues/month
 * - Enterprise: Everything
 * - Super admin: Everything
 */
export function useFeatureAccess() {
  const { plan, isPaidPlan, isFreePlan, creditsRemaining, hasCredits } = useCredits();
  const { isSuperAdmin } = useUserRole();

  const isStarter = plan === "starter";
  const isPro = plan === "pro";
  const isEnterprise = plan === "enterprise";
  const isProOrAbove = isPro || isEnterprise;

  return {
    // Upload Catalogue: PRO+ only (2/month, enforced in DashboardUpload)
    canUploadCatalogue: isSuperAdmin || isProOrAbove,
    uploadCatalogueRequiredPlan: "Pro Plan ($399/mo — 2 catalogues/month)",

    // Broodmare Plans: PRO+ only
    canBroodmare: isSuperAdmin || isProOrAbove,
    broodmareRequiredPlan: "Pro Plan ($399/mo)",

    // Matings Analysis: Starter+ only
    canMatings: isSuperAdmin || isPaidPlan,
    matingsRequiredPlan: "Starter or Pro Plan",

    // Weekly Reports: Starter+ only
    canReports: isSuperAdmin || isPaidPlan,
    reportsRequiredPlan: "Starter or Pro Plan",

    // PDF Download: paid plans only (not free)
    canDownloadPDF: isSuperAdmin || isPaidPlan,

    // Horse Search: everyone
    canHorseSearch: true,

    // Stallion Search: everyone
    canStallionSearch: true,

    // Performance: everyone (read-only)
    canPerformance: true,

    // AI Chat: everyone with credits
    canChat: true,

    // Market Insights: Starter+
    canMarket: isSuperAdmin || isPaidPlan,
    marketRequiredPlan: "Starter or Pro Plan",

    // Breeze-Up Analysis: PRO+ only
    canBreezeUp: isSuperAdmin || isProOrAbove,
    breezeUpRequiredPlan: "Pro Plan ($399/mo)",

    // Visual Analysis: PRO+ only
    canVisualAnalysis: isSuperAdmin || isProOrAbove,
    visualAnalysisRequiredPlan: "Pro Plan ($399/mo)",

    // Upload Single PDFs: Starter+ only (NOT free plan)
    canUploadSinglePDF: isSuperAdmin || isPaidPlan,
    uploadSinglePDFRequiredPlan: "Starter or Pro Plan",

    // General
    isSuperAdmin,
    plan,
  };
}
