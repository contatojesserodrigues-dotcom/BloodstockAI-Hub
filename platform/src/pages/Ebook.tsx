import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Brain, TrendingUp, Target, Shield, Sparkles, ChevronDown, Mail, Loader2, Download, GraduationCap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import ebookCover from "@/assets/ebook-cover.png";
import logoSymbol from "@/assets/logo.png";
import { SEO } from "@/components/SEO";

const emailSchema = z.string().trim().email("Please enter a valid email").max(255);

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const Ebook = () => {
  const [nlEmail, setNlEmail] = useState("");
  const [nlHoneypot, setNlHoneypot] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Check if user already purchased the ebook
  useEffect(() => {
    if (!user) return;
    const checkPurchase = async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("plan_id", "ebook")
        .eq("status", "completed")
        .limit(1);
      if (data && data.length > 0) {
        setHasPurchased(true);
      }
    };
    checkPurchase();
  }, [user]);

  // Check URL params for returning from payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchased") === "true") {
      setHasPurchased(true);
      toast({ title: "Payment Confirmed! 🎉", description: "Your ebook is ready to download." });
      // Clean URL
      window.history.replaceState({}, "", "/ebook");
    }
  }, []);

  const handlePurchase = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { planId: "ebook", billingCycle: "one_time" },
      });
      if (error) throw error;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast({ title: "Payment error", description: err.message || "Could not start checkout", variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

  const handleDownload = () => {
    toast({ title: "Download starting…", description: "Your ebook PDF is being prepared." });
    const link = document.createElement("a");
    link.href = "/ebooks/AI_Models_Behind_Winning_Racehorses.pdf";
    link.download = "AI_Models_Behind_Winning_Racehorses.pdf";
    link.click();
  };

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nlHoneypot) return;
    const result = emailSchema.safeParse(nlEmail);
    if (!result.success) {
      toast({ title: "Invalid email", description: result.error.errors[0]?.message, variant: "destructive" });
      return;
    }
    setNlLoading(true);
    try {
      const { error } = await supabase.functions.invoke("contact-inquiry", {
        body: { email: result.data, type: "newsletter", _hp: nlHoneypot },
      });
      if (error) throw error;
      toast({ title: "Subscribed!", description: "You'll receive our latest insights and updates." });
      setNlEmail("");
    } catch {
      toast({ title: "Failed", description: "Please try again later.", variant: "destructive" });
    } finally {
      setNlLoading(false);
    }
  };

  const PurchaseButton = ({ className = "", size = "default" as const }: { className?: string; size?: "default" | "sm" | "lg" }) => {
    if (hasPurchased) {
      return (
        <Button variant="premium" size={size} className={className} onClick={handleDownload}>
          <Download className="w-5 h-5 mr-2" />
          Download Your Ebook (PDF)
        </Button>
      );
    }
    return (
      <Button variant="premium" size={size} className={className} onClick={handlePurchase} disabled={purchasing}>
        {purchasing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
        {purchasing ? "Processing…" : "Buy Now — $79"}
        {!purchasing && <ArrowRight className="ml-2 w-5 h-5" />}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SEO
        title="AI Models Behind Winning Racehorses — Ebook | BloodstockAI"
        description="Digital ebook on AI thoroughbred analysis: pedigree, performance and breeding intelligence behind today's winning racehorses."
        path="/ebook"
      />
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-secondary/10">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src={logoSymbol} alt="BloodstockAI" className="h-10 w-auto object-contain" />
            <span className="text-lg font-semibold tracking-tight text-foreground/90 font-body">BloodstockAI</span>
          </a>
          {hasPurchased ? (
            <Button variant="premium" className="text-xs px-4 sm:px-5 uppercase tracking-wider" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1.5" /> Download PDF
            </Button>
          ) : (
            <Button variant="premium" className="text-xs px-4 sm:px-5 uppercase tracking-wider" onClick={handlePurchase} disabled={purchasing}>
              {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get the Ebook — $79"}
            </Button>
          )}
        </div>
      </header>

      {/* ======== HERO SECTION ======== */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[140px]" />
        </div>
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />

        <div className="container relative z-10 mx-auto px-4 sm:px-6 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left: Copy */}
            <motion.div
              className="space-y-6 sm:space-y-8 text-center lg:text-left order-2 lg:order-1"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            >
              <motion.div variants={fadeUp} custom={0}>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold tracking-wider uppercase">
                  <Sparkles className="w-3.5 h-3.5" />
                  Limited Release for Industry Professionals
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                custom={1}
                className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-luxury font-bold leading-[1.1] tracking-wide uppercase"
              >
                AI Models Behind{" "}
                <span className="text-secondary">
                  Winning Racehorses
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                custom={2}
                className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed font-body"
              >
                Discover how Artificial Intelligence is redefining elite bloodstock selection, pedigree analysis, and performance prediction in the modern Thoroughbred industry.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <PurchaseButton className="w-full sm:w-auto font-bold text-sm sm:text-base px-6 sm:px-8 h-12 sm:h-14 uppercase tracking-wider" />
              </motion.div>

              {!hasPurchased && (
                <motion.p variants={fadeUp} custom={4} className="text-muted-foreground/50 text-xs font-body">
                  One-time payment via Revolut · Instant PDF download
                </motion.p>
              )}
            </motion.div>

            {/* Right: Ebook Mockup */}
            <motion.div
              className="flex justify-center order-1 lg:order-2"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-b from-secondary/20 via-secondary/10 to-transparent blur-[60px] scale-110" />
                <img
                  src={ebookCover}
                  alt="AI Models Behind Winning Racehorses - BloodstockAI Ebook"
                  className="relative z-10 w-[260px] sm:w-[300px] md:w-[380px] lg:w-[420px] drop-shadow-[0_20px_60px_rgba(212,175,55,0.35)]"
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 hidden md:block">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-6 h-6 text-secondary/40" />
          </motion.div>
        </div>
      </section>

      {/* ======== EBOOK SHOWCASE ======== */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-card to-background" />
        <div className="container relative z-10 mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center max-w-5xl mx-auto">
            <motion.div
              className="flex justify-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              custom={0}
            >
              <div className="relative">
                <div className="absolute -inset-8 bg-secondary/10 rounded-full blur-[80px]" />
                <img
                  src={ebookCover}
                  alt="Ebook cover"
                  className="relative z-10 w-[240px] sm:w-[280px] md:w-[340px] drop-shadow-[0_30px_80px_rgba(212,175,55,0.3)]"
                />
              </div>
            </motion.div>

            <motion.div
              className="space-y-6 text-center md:text-left"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            >
              <motion.p variants={fadeUp} custom={0} className="text-secondary text-sm font-semibold tracking-wider uppercase">
                Strategic Intelligence
              </motion.p>
              <motion.h2 variants={fadeUp} custom={1} className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-luxury font-bold leading-tight text-foreground uppercase tracking-wide">
                This Is Not Just an Ebook.
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-lg mx-auto md:mx-0 font-body">
                It is a strategic intelligence framework for the future of racing, breeding, and bloodstock investment.
              </motion.p>
              <motion.div variants={fadeUp} custom={3}>
                <PurchaseButton className="w-full sm:w-auto font-bold text-sm sm:text-base px-6 sm:px-8 h-12 sm:h-14 uppercase tracking-wider" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ======== AUTHORITY / STORY SECTION ======== */}
      <section className="relative py-20 md:py-32">
        <div className="absolute inset-0 bg-background" />
        <div className="container relative z-10 mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              custom={0}
            >
              <p className="text-secondary text-sm font-semibold tracking-wider uppercase mb-4">
                The Context
              </p>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-luxury font-bold text-foreground uppercase tracking-wide">
                The Intelligence Shift in the Thoroughbred Industry
              </h2>
            </motion.div>

            <motion.div
              className="space-y-12"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
            >
              {[
                { title: "Industry Tradition", text: "For centuries, the Thoroughbred industry has operated on a foundation of inherited wisdom, personal relationships, and intuitive expertise. Breeders, owners, and bloodstock agents have relied on visual assessments, pedigree reputation, and track-side experience to make high-stakes investment decisions. This deep tradition has produced iconic champions and legendary breeding programs — and rightfully remains a cornerstone of the industry's identity." },
                { title: "The Data Explosion & the Problem", text: "However, the modern racing and breeding ecosystem now generates an unprecedented volume of data — from race performance metrics, veterinary records, and genomic analysis to auction results, market trends, and cross-continental breeding patterns. The sheer scale and complexity of this information far exceeds what any individual, regardless of experience, can consistently process, compare, and evaluate effectively. Critical insights are lost. Value is overlooked. Risk is misjudged." },
                { title: "AI as the Strategic Evolution", text: "Artificial Intelligence does not seek to replace the art of bloodstock expertise — it amplifies it. By applying machine learning models to pedigree structures, performance databases, and market dynamics, AI empowers professionals with a layer of analytical precision that was previously impossible to achieve at scale. The result is not a departure from tradition, but an evolution — one where data-augmented intelligence becomes the competitive edge for those who embrace it." },
              ].map((section, i) => (
                <motion.div key={i} variants={fadeUp} custom={i} className="space-y-4">
                  <div className="w-12 h-px bg-gradient-to-r from-secondary to-transparent" />
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground/90" style={{ fontFamily: "'Cinzel', serif" }}>{section.title}</h3>
                  <p className="text-muted-foreground leading-[1.8] text-[13px] sm:text-[15px] font-body">
                    {section.text}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ======== PERSUASION / WHY AI ======== */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background" />
        <div className="container relative z-10 mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
          >
            <p className="text-secondary text-sm font-semibold tracking-wider uppercase mb-4">Why It Matters</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-luxury font-bold text-foreground uppercase tracking-wide">
              Why Industry Leaders Are Turning to AI
            </h2>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {[
              { icon: Brain, title: "Advanced Pedigree Intelligence", desc: "Deep neural analysis of multi-generational bloodlines and genetic patterns." },
              { icon: TrendingUp, title: "Performance Pattern Detection", desc: "Identify hidden performance indicators across thousands of race records." },
              { icon: Target, title: "Data-Driven Decisions", desc: "Quantitative frameworks for evaluating acquisition opportunities." },
              { icon: BookOpen, title: "Hidden Value at Sales", desc: "Surface undervalued lots that traditional methods consistently overlook." },
              { icon: Shield, title: "Competitive Edge", desc: "Operate with informational advantages in an increasingly competitive market." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                custom={i}
                className="group relative rounded-lg border border-border bg-card p-5 sm:p-8 hover:border-secondary/20 transition-all duration-500"
              >
                <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-secondary/0 to-secondary/0 group-hover:from-secondary/[0.03] group-hover:to-transparent transition-all duration-500" />
                <div className="relative z-10 space-y-4">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-secondary/10 border border-secondary/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-secondary" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground/90" style={{ fontFamily: "'Cinzel', serif" }}>{item.title}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed font-body">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ======== URGENCY / SCARCITY ======== */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/[0.03] via-transparent to-secondary/[0.03]" />
        <div className="container relative z-10 mx-auto px-4 sm:px-6 text-center">
          <motion.div
            className="max-w-3xl mx-auto space-y-6 sm:space-y-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          >
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold tracking-wider uppercase">
                Exclusive Early Access Release
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-luxury font-bold text-foreground leading-tight uppercase tracking-wide">
              The Future of Bloodstock Decision-Making Has Already Begun
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-body">
              Early adopters of intelligence-driven analysis will operate with a structural advantage in an increasingly competitive global market.
            </motion.p>
            <motion.div variants={fadeUp} custom={3}>
              <PurchaseButton className="w-full sm:w-auto font-bold text-sm sm:text-lg px-8 sm:px-10 h-14 sm:h-16 uppercase tracking-wider" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ======== AI COURSE — COMING SOON ======== */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[150px]" />
        </div>
        <div className="container relative z-10 mx-auto px-4 sm:px-6">
          <motion.div
            className="max-w-4xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          >
            <motion.div variants={fadeUp} custom={0} className="text-center mb-10">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold tracking-wider uppercase mb-6">
                <Clock className="w-3.5 h-3.5" />
                Coming May 2026
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-luxury font-bold text-foreground uppercase tracking-wide mt-4">
                AI for{" "}
                <span className="text-secondary">Bloodstocks</span>
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mt-4 leading-relaxed font-body">
                A comprehensive online course designed to teach bloodstock professionals how to leverage AI tools for superior horse analysis, pedigree evaluation, and market intelligence.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-10">
              {[
                { icon: Brain, title: "AI Fundamentals", desc: "Understand how AI models work and how they apply to the Thoroughbred industry." },
                { icon: Target, title: "Practical Analysis", desc: "Hands-on exercises using real bloodstock data and AI-powered tools." },
                { icon: TrendingUp, title: "Market Edge", desc: "Learn to identify undervalued horses and predict market trends with data." },
                { icon: BookOpen, title: "Pedigree Intelligence", desc: "Master AI-driven pedigree analysis and breeding pattern recognition." },
                { icon: Shield, title: "Risk Assessment", desc: "Use quantitative models to evaluate investment risk and opportunity." },
                { icon: GraduationCap, title: "Certification", desc: "Earn a BloodstockAI certificate upon completion of the full course." },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-border/50 bg-card/50 p-5 space-y-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary/10 border border-secondary/10 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-secondary" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground/90" style={{ fontFamily: "'Cinzel', serif" }}>{item.title}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed font-body">{item.desc}</p>
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} custom={2} className="text-center">
              <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl border border-secondary/20 bg-secondary/5">
                <Clock className="w-5 h-5 text-secondary" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Cinzel', serif" }}>Coming Soon — May 2026</p>
                  <p className="text-xs text-muted-foreground font-body">Subscribe to our newsletter to be notified when enrollment opens.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ======== FINAL CTA ======== */}
      <section className="relative py-24 md:py-36 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/10 rounded-full blur-[200px]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 text-center">
          <motion.div
            className="max-w-3xl mx-auto space-y-6 sm:space-y-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-luxury font-bold text-foreground leading-[1.1] uppercase tracking-wide">
              From Tradition to{" "}
              <span className="text-secondary">Intelligence.</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl mx-auto leading-relaxed font-body">
              Stop relying only on intuition.<br />
              Start making data-augmented bloodstock decisions.
            </motion.p>
            <motion.div variants={fadeUp} custom={2}>
              <PurchaseButton className="w-full sm:w-auto font-bold text-xs sm:text-base md:text-lg px-6 sm:px-10 h-14 sm:h-16 uppercase tracking-wider" />
            </motion.div>
            <motion.p variants={fadeUp} custom={3} className="text-muted-foreground/40 text-xs sm:text-sm font-body">
              For Owners, Breeders, Investors, and Bloodstock Professionals.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ======== NEWSLETTER SECTION ======== */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-card" />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/[0.03] via-transparent to-secondary/[0.03]" />
        <div className="container relative z-10 mx-auto px-4 sm:px-6">
          <motion.div
            className="max-w-2xl mx-auto text-center space-y-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          >
            <motion.div variants={fadeUp} custom={0}>
              <Mail className="w-10 h-10 mx-auto text-secondary/70 mb-2" />
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-luxury font-bold text-foreground uppercase tracking-wide">
              Stay Ahead of the Market
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto leading-relaxed font-body">
              Get exclusive insights on AI-driven bloodstock analysis, market intelligence, and industry trends delivered to your inbox.
            </motion.p>
            <motion.form variants={fadeUp} custom={3} onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
              <div className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true">
                <input name="fax_number" type="text" tabIndex={-1} autoComplete="off" value={nlHoneypot} onChange={e => setNlHoneypot(e.target.value)} />
              </div>
              <Input
                type="email"
                placeholder="Enter your email"
                value={nlEmail}
                onChange={(e) => setNlEmail(e.target.value)}
                required
                className="bg-card border-border text-foreground placeholder:text-muted-foreground/50 focus:border-secondary/50 h-12"
              />
              <Button type="submit" disabled={nlLoading} variant="premium" className="h-12 px-6 uppercase tracking-wider text-xs whitespace-nowrap">
                {nlLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Subscribe
              </Button>
            </motion.form>
          </motion.div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t border-secondary/10 bg-background py-8">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoSymbol} alt="BloodstockAI" className="h-8 w-auto object-contain" />
            <span className="text-sm text-muted-foreground/60 font-body">© {new Date().getFullYear()} BloodstockAI</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground/40 font-body">
            <a href="/terms" className="hover:text-secondary transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-secondary transition-colors">Privacy</a>
            <a href="/" className="hover:text-secondary transition-colors">Platform</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Ebook;
