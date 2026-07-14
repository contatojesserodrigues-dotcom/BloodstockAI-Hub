import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CookieConsent from "./components/CookieConsent";
import { NewsletterPopup } from "./components/NewsletterPopup";
import { FloatingNewsletterButton } from "./components/FloatingNewsletterButton";
import Ebook from "./pages/Ebook";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import Reports from "./pages/Reports";
import ReportTemplates from "./pages/ReportTemplates";
import MarketUpdate from "./pages/MarketUpdate";
import HorsesForSale from "./pages/HorsesForSale";
import HorseListingDetail from "./pages/HorseListingDetail";
import AnalyzedCatalogs from "./pages/AnalyzedCatalogs";
import SalesCatalogs from "./pages/SalesCatalogs";
import Advisory from "./pages/Advisory";
import AdminHorsesList from "./pages/admin/AdminHorsesList";
import AdminHorseNew from "./pages/admin/AdminHorseNew";
import AdminHorseEdit from "./pages/admin/AdminHorseEdit";
import { CanonicalDomainRedirect } from "./components/CanonicalDomainRedirect";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageLoader } from "./components/PageLoader";

const Dashboard = lazy(() => import("./pages/Dashboard"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CanonicalDomainRedirect />
        <CookieConsent />
        <NewsletterPopup />
        <FloatingNewsletterButton />
        <ErrorBoundary>
        <Suspense fallback={<PageLoader label="Loading BloodstockAI…" />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms-of-service" element={<Terms />} />
          <Route path="/privacy-policy" element={<Privacy />} />
          <Route path="/ebook" element={<Ebook />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/report-templates" element={<ReportTemplates />} />
          <Route path="/market-update" element={<MarketUpdate />} />
          <Route path="/horses-for-sale" element={<HorsesForSale />} />
          <Route path="/horses-for-sale/:id" element={<HorseListingDetail />} />
          <Route path="/sales-catalogs" element={<SalesCatalogs />} />
          <Route path="/analyzed-catalogs" element={<AnalyzedCatalogs />} />
          <Route path="/advisory" element={<Advisory />} />
          <Route path="/services" element={<Advisory />} />
          <Route path="/admin/horses-for-sale" element={<AdminHorsesList />} />
          <Route path="/admin/horses-for-sale/new" element={<AdminHorseNew />} />
          <Route path="/admin/horses-for-sale/:id/edit" element={<AdminHorseEdit />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancelled" element={<PaymentCancelled />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
