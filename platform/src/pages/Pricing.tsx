import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Check, Star, Loader2, Clock } from "lucide-react";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useSubscription } from "@/integrations/supabase/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { PlanInquiryModal } from "@/components/PlanInquiryModal";
import { SEO } from "@/components/SEO";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { plan: currentPlan, loading: subscriptionLoading } = useSubscription(user?.id);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [selectedPlanName, setSelectedPlanName] = useState("");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const { toast } = useToast();

  const plans = [
    {
      name: "Single Analysis",
      monthlyPrice: "$99",
      annualPrice: "$59",
      annualOriginalPrice: "$79",
      annualOriginalTotal: "$948/year",
      annualTotal: "$711/year",
      period: "/month",
      description: "For active bloodstock professionals",
      features: [
        "Up to 1 complete analysis per lot at auctions",
        "Pedigree 6 generations",
        "Nick Rating & Dosage Analysis",
        "Siblings Analysis",
        "Matings Analysis",
        "Sale Inspection Analysis",
        "Training Analysis — video + GPS, history & reports",
        "Upload Single PDFs — unlimited",
        "PDF Download unlimited",
        "Email support",
        "Cancel anytime",
      ],
      lockedFeatures: [
        "Upload Auction Catalogue (PRO only)",
        "Visual Analysis (PRO only)",
        "Breeze-Up Analysis (PRO only)",
        "Broodmare Plans (PRO only)",
      ],
      note: "Need more than 3 analyses? Consult our Bloodstock Advisory services.",
      cta: "Get Started",
      highlighted: false,
      plan: "pro" as const,
      paymentPlanId: "starter",
    },
    {
      name: "Professional",
      monthlyPrice: "$399",
      annualPrice: "$239",
      annualOriginalPrice: "$319",
      annualOriginalTotal: "$3,828/year",
      annualTotal: "$2,871/year",
      period: "/month",
      description: "Full platform access for power users",
      features: [
        "Everything in Single Analysis",
        "1,000 analyses per month",
        "2 catalogue uploads / month",
        "Upload Single PDFs — unlimited",
        "Breeze-Up Analysis",
        "Broodmare Plans",
        "Visual Analysis — Photo & Video",
        "Sale Inspection Analysis",
        "Training Analysis — video + GPS, history & reports",
        "Market Insights",
        "Weekly Reports",
        "Priority support",
        "Cancel anytime",
      ],
      lockedFeatures: [],
      note: "Need more? See Enterprise plan",
      cta: "Go Professional",
      highlighted: true,
      plan: "enterprise" as const,
      paymentPlanId: "professional",
    },
  ];

  const enterpriseFeatures = [
    "Unlimited analyses",
    "Full API access",
    "Upload Auction Catalogue — unlimited",
    "Breeze-Up Analysis",
    "Visual Analysis — Photo & Video",
    "Sale Inspection Analysis",
    "Training Analysis — unlimited horses & sessions",
    "White label reports (your logo)",
    "Multiple user seats",
    "Custom dashboard",
    "Bulk catalog analysis",
    "Broodmare portfolio management",
    "Dedicated account manager",
    "Priority support & SLA",
    "Annual contract available",
  ];


  const handlePlanAction = async (planItem: typeof plans[0]) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Direct Revolut checkout links for the Professional (Pro) plan
    if (planItem.paymentPlanId === "professional") {
      const proLinks = {
        monthly: "https://checkout.revolut.com/subscription/5c62f1b5-3d5b-4f2b-8b91-bec564f06a39",
        annual: "https://checkout.revolut.com/subscription/c5bd25ac-5fd2-41fb-8e96-7264ca7428cd",
      };
      window.location.href = proLinks[billingCycle];
      return;
    }

    setLoadingPlan(planItem.paymentPlanId);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { planId: planItem.paymentPlanId, billingCycle },
      });

      if (error) throw error;

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data?.redirect) {
        navigate(data.redirect);
      }
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Pricing — BloodstockAI Plans for Agents & Breeders"
        description="Starter and Professional plans for thoroughbred professionals. Catalogue analysis, breeze-up video, broodmare planning and more."
        path="/pricing"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: "BloodstockAI Starter",
            description: "Monthly subscription for active bloodstock professionals — 1,000 analyses, pedigree, matings, PDF reports.",
            brand: { "@type": "Brand", name: "BloodstockAI" },
            offers: { "@type": "Offer", price: "99", priceCurrency: "USD", url: "https://www.agentbloodstockai.com/pricing" },
          },
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: "BloodstockAI Professional",
            description: "Full PRO access — catalogue uploads, visual & breeze-up analysis, broodmare plans, 1,000 analyses per month.",
            brand: { "@type": "Brand", name: "BloodstockAI" },
            offers: { "@type": "Offer", price: "399", priceCurrency: "USD", url: "https://www.agentbloodstockai.com/pricing" },
          },
        ]}
      />
      <Header />
      
      <main className="flex-1 pt-16">
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
          <div className="container mx-auto max-w-6xl">
            {/* Heading */}
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
                Simple, Transparent Pricing
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose the plan that best fits your bloodstock analysis needs
              </p>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === "monthly"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === "annual"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual
                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
                  <Clock className="w-2.5 h-2.5" /> 3 Months Free
                </span>
              </button>
            </div>


            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-start">
              {plans.map((planItem) => {
                const price = billingCycle === "annual" ? planItem.annualPrice : planItem.monthlyPrice;
                return (
                  <div
                    key={planItem.name}
                    className={`rounded-xl p-5 sm:p-6 relative ${
                      planItem.highlighted
                        ? "bg-primary text-primary-foreground border-2 border-secondary shadow-2xl md:scale-105"
                        : "bg-card border border-border"
                    }`}
                  >
                    {planItem.highlighted && (
                      <Badge className="absolute top-3 right-3 bg-secondary text-secondary-foreground flex items-center gap-1 text-[10px]">
                        <Star className="w-3 h-3" /> Most Popular
                      </Badge>
                    )}
                    
                    <div className="mb-4 sm:mb-5">
                      <h3 className={`text-lg sm:text-xl font-bold mb-1 ${planItem.highlighted ? "text-secondary" : "text-foreground"}`}>
                        {planItem.name}
                      </h3>
                      <div className="mb-1">
                        <span className={`text-2xl sm:text-3xl font-bold ${planItem.highlighted ? "text-secondary" : "text-foreground"}`}>
                          {price}
                        </span>
                        <span className={`text-xs sm:text-sm ml-1 ${planItem.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {planItem.period}
                        </span>
                      </div>
                      {billingCycle === "annual" && (
                        <div className="space-y-1">
                          {planItem.annualOriginalTotal && (
                            <p className="text-xs text-muted-foreground line-through">{planItem.annualOriginalTotal}</p>
                          )}
                          <p className="text-xs text-green-400 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" /> 3 months free — {planItem.annualTotal}
                          </p>
                          <p className="text-[10px] text-secondary/80 font-medium uppercase tracking-wider">
                            Limited time offer
                          </p>
                        </div>
                      )}
                      <p className={`text-xs sm:text-sm ${planItem.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {planItem.description}
                      </p>
                    </div>

                    <ul className="space-y-2 sm:space-y-2.5 mb-5 sm:mb-6">
                      {planItem.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 text-secondary`} />
                          <span className={`text-xs sm:text-sm ${planItem.highlighted ? "text-primary-foreground" : "text-foreground"}`}>
                            {feature}
                          </span>
                        </li>
                      ))}
                      {planItem.lockedFeatures?.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 opacity-50">
                          <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-center text-xs">🔒</span>
                          <span className={`text-xs sm:text-sm ${planItem.highlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {planItem.note && (
                      <p className={`text-[10px] sm:text-xs mb-3 ${planItem.highlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {planItem.note}
                      </p>
                    )}

                    <Button
                      onClick={() => handlePlanAction(planItem)}
                      disabled={loadingPlan === planItem.paymentPlanId || currentPlan === planItem.plan}
                      className={`w-full text-xs sm:text-sm ${
                        planItem.highlighted
                          ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                          : ""
                      }`}
                      variant={planItem.highlighted ? "default" : "outline"}
                      size="default"
                    >
                      {loadingPlan === planItem.paymentPlanId ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                      ) : currentPlan === planItem.plan ? (
                        "Current Plan"
                      ) : (
                        planItem.cta
                      )}
                    </Button>
                  </div>
                );
              })}

              {/* Enterprise Card */}
              <div className="rounded-xl p-5 sm:p-6 bg-card border border-border relative">
                <div className="mb-4 sm:mb-5">
                  <h3 className="text-lg sm:text-xl font-bold mb-1 text-foreground">Enterprise</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">For Major Studs & Large Operations</p>
                  <p className="text-2xl sm:text-3xl font-bold text-secondary">Custom Pricing</p>
                </div>

                <ul className="space-y-2 sm:space-y-2.5 mb-5 sm:mb-6">
                  {enterpriseFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-secondary" />
                      <span className="text-xs sm:text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant="outline"
                  className="w-full border-secondary text-secondary hover:bg-secondary/10 text-xs sm:text-sm"
                  size="default"
                  onClick={() => window.location.href = "mailto:office@bloodstockai.com?subject=Enterprise Plan Inquiry"}
                >
                  Contact Our Team →
                </Button>
              </div>
            </div>


            <p className="text-center text-[10px] sm:text-xs text-muted-foreground mt-6 sm:mt-8">
              No contracts. Cancel anytime. Trusted by bloodstock professionals at Keeneland, Fasig-Tipton and OBS.
            </p>
          </div>
        </section>
      </main>

      <Footer />

      <PlanInquiryModal
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        planName={selectedPlanName}
      />

      
    </div>
  );
}