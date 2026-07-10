import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Video, GitMerge, TrendingUp, ArrowRight, Activity, LayoutDashboard, Briefcase, Cpu } from "lucide-react";

export const WhyChoose = () => {
  const capabilities = [
    {
      icon: FileText,
      badge: "Catalogue",
      title: "Catalogue Intelligence & Buying Advisory",
      desc: "Upload any auction catalogue from Tattersalls, Goffs, Keeneland, Fasig-Tipton, Magic Millions or OBS. Every lot is evaluated across pedigree, performance, sire trends, female families, market intelligence and historical data to surface the strongest buying opportunities before the session opens.",
      options: "Bloodstock Advisory — our team delivers a professional shortlist. Platform Subscription — analyse unlimited catalogues yourself."
    },
    {
      icon: Video,
      badge: "Inspection",
      title: "Biomechanics, Conformation & Auction Inspection",
      desc: "Upload breeze-up, walking or conformation footage to generate a structured biomechanical report covering stride mechanics, limb extension, movement symmetry, muscle balance and conformational observations. For clients attending sales, we also provide professional pre-purchase inspections combining physical evaluation, biomechanics, pedigree and market assessment in one integrated report.",
      options: "Available as Bloodstock Advisory or Self-Service Platform."
    },
    {
      icon: Activity,
      badge: "Trainers",
      title: "Trainer Performance Intelligence",
      desc: "For trainers, racing stables and owners. Build an individual profile for every horse and monitor its athletic development throughout training. Integrate data from Arioneo, Equimetre and compatible GPS and biometric trackers to compare historical sessions, stride efficiency, workload progression and performance trends — the same AI used to evaluate breeze-up horses, applied across the racing career.",
      options: "Available as Bloodstock Advisory or Platform Subscription."
    },
    {
      icon: GitMerge,
      badge: "Breeding",
      title: "Breeding Intelligence & Mating Advisory",
      desc: "Build complete mating strategies supported by pedigree analytics, nicking analysis, female family performance, sire compatibility, commercial trends and projected ROI. Choose a fully managed advisory engagement or build unlimited mating plans yourself through the platform.",
      options: "Bloodstock Advisory or Platform Subscription."
    },
    {
      icon: TrendingUp,
      badge: "Valuation",
      title: "Commercial Value & Investment Analysis",
      desc: "Evaluate yearlings and pinhooking prospects using market intelligence, comparable sales, sire performance, biomechanical data and commercial forecasting. Generate realistic valuation ranges, resale scenarios and investment projections before purchasing.",
      options: "Available through Bloodstock Advisory or Platform Subscription."
    },
    {
      icon: LayoutDashboard,
      badge: "Dashboard",
      title: "Stable Performance Dashboard",
      desc: "A central workspace for trainers, owners and bloodstock agents to monitor every horse in their stable — individual profiles, pedigree, biomechanics, veterinary history, training records, race performance, auction history, media library, AI performance timeline and market valuation. Everything connected in one professional workspace.",
      options: "Available as Bloodstock Advisory or Platform Subscription."
    }
  ];

  return (
    <>
      {/* What We Do — Capabilities */}
      <section id="how-it-works" className="bg-card relative overflow-hidden" style={{ paddingTop: 'clamp(40px, 6vw, 72px)', paddingBottom: 'clamp(40px, 6vw, 72px)' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-secondary/20 to-transparent" />

        <div className="container mx-auto" style={{ paddingLeft: 'clamp(20px, 5vw, 72px)', paddingRight: 'clamp(20px, 5vw, 72px)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(8px, 1.5vw, 12px)', marginBottom: 'clamp(24px, 4vw, 40px)' }}>
              <p className="uppercase text-secondary font-medium" style={{ fontSize: 'clamp(0.6rem, 1.2vw, 0.65rem)', letterSpacing: '0.08em' }}>
                What We Do
              </p>
              <h2 className="font-luxury font-bold text-foreground uppercase" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', lineHeight: '1.15', letterSpacing: '-0.01em' }}>
                Everything you need
                <br />
                <span className="text-secondary">in one platform.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'clamp(10px, 2vw, 18px)' }}>
              {capabilities.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div
                    key={index}
                    className="group relative rounded-lg bg-background border border-border hover:border-secondary/30 transition-all duration-500"
                    style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                    <div className="relative z-10" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.5vw, 12px)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <Icon className="text-secondary" style={{ width: 'clamp(1.4rem, 4vw, 1.8rem)', height: 'clamp(1.4rem, 4vw, 1.8rem)' }} />
                        <span className="uppercase font-semibold px-2 py-0.5 rounded-full border border-secondary/30 text-secondary bg-secondary/5 whitespace-nowrap" style={{ fontSize: 'clamp(0.6rem, 0.85vw, 0.65rem)', letterSpacing: '0.08em' }}>
                          {card.badge}
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground font-luxury" style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.1rem)', lineHeight: '1.2' }}>
                        {card.title}
                      </h3>
                      <p className="text-muted-foreground font-body" style={{ fontSize: 'clamp(0.82rem, 1.5vw, 0.95rem)', lineHeight: '1.6' }}>
                        {card.desc}
                      </p>
                      <p className="text-secondary/80 font-body uppercase" style={{ fontSize: 'clamp(0.62rem, 0.9vw, 0.68rem)', letterSpacing: '0.06em', marginTop: '4px' }}>
                        {card.options}
                      </p>
                    </div>
                  </div>);

              })}
            </div>

            {/* Choose How You Work With BloodstockAI */}
            <div className="mt-10 sm:mt-14 max-w-5xl mx-auto">
              <div className="text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(8px, 1.5vw, 12px)', marginBottom: 'clamp(20px, 3vw, 28px)' }}>
                <p className="uppercase text-secondary font-medium" style={{ fontSize: 'clamp(0.6rem, 1.2vw, 0.65rem)', letterSpacing: '0.08em' }}>Two Ways to Engage</p>
                <h3 className="font-luxury font-bold text-foreground uppercase" style={{ fontSize: 'clamp(1.15rem, 2.4vw, 1.6rem)', lineHeight: '1.2', letterSpacing: '-0.01em' }}>
                  Choose How You Work With <span className="text-secondary">BloodstockAI</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'clamp(10px, 2vw, 18px)' }}>
                <div className="group rounded-lg bg-background border border-border transition-all duration-500 hover:border-secondary/30" style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="text-secondary" style={{ width: 'clamp(1.3rem, 3vw, 1.6rem)', height: 'clamp(1.3rem, 3vw, 1.6rem)' }} />
                    <span className="uppercase font-semibold text-secondary" style={{ fontSize: 'clamp(0.62rem, 0.9vw, 0.68rem)', letterSpacing: '0.08em' }}>Bloodstock Advisory</span>
                  </div>
                  <h4 className="font-bold text-foreground font-luxury mb-2" style={{ fontSize: 'clamp(1rem, 1.6vw, 1.15rem)', lineHeight: '1.25' }}>Fully managed by our specialists.</h4>
                  <p className="text-muted-foreground font-body mb-4" style={{ fontSize: 'clamp(0.82rem, 1.5vw, 0.95rem)', lineHeight: '1.6' }}>
                    Our bloodstock specialists handle the analysis, inspection and recommendations for you — delivered as institutional-grade reports ready for decision-making.
                  </p>
                  <Link to="/advisory" className="inline-flex items-center gap-1.5 uppercase font-semibold text-secondary transition-all duration-300 group-hover:gap-2.5" style={{ fontSize: 'clamp(0.62rem, 0.9vw, 0.68rem)', letterSpacing: '0.08em' }}>
                    Explore Advisory <ArrowRight style={{ width: 'clamp(0.8rem, 1.1vw, 0.9rem)', height: 'clamp(0.8rem, 1.1vw, 0.9rem)' }} />
                  </Link>
                </div>
                <div className="group rounded-lg bg-background border border-border transition-all duration-500 hover:border-secondary/30" style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="text-secondary" style={{ width: 'clamp(1.3rem, 3vw, 1.6rem)', height: 'clamp(1.3rem, 3vw, 1.6rem)' }} />
                    <span className="uppercase font-semibold text-secondary" style={{ fontSize: 'clamp(0.62rem, 0.9vw, 0.68rem)', letterSpacing: '0.08em' }}>Platform Subscription</span>
                  </div>
                  <h4 className="font-bold text-foreground font-luxury mb-2" style={{ fontSize: 'clamp(1rem, 1.6vw, 1.15rem)', lineHeight: '1.25' }}>Complete autonomy inside the platform.</h4>
                  <p className="text-muted-foreground font-body mb-4" style={{ fontSize: 'clamp(0.82rem, 1.5vw, 0.95rem)', lineHeight: '1.6' }}>
                    Access the same professional tools with complete autonomy and unlimited analyses across catalogues, biomechanics, mating plans and performance tracking.
                  </p>
                  <Link to="/pricing" className="inline-flex items-center gap-1.5 uppercase font-semibold text-secondary transition-all duration-300 group-hover:gap-2.5" style={{ fontSize: 'clamp(0.62rem, 0.9vw, 0.68rem)', letterSpacing: '0.08em' }}>
                    View Plans <ArrowRight style={{ width: 'clamp(0.8rem, 1.1vw, 0.9rem)', height: 'clamp(0.8rem, 1.1vw, 0.9rem)' }} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why BloodstockAI — 7 Feature Cards */}
      <section className="bg-background relative overflow-hidden" style={{ paddingTop: 'clamp(40px, 6vw, 72px)', paddingBottom: 'clamp(40px, 6vw, 72px)' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-secondary/20 to-transparent" />

        <div className="container mx-auto" style={{ paddingLeft: 'clamp(20px, 5vw, 72px)', paddingRight: 'clamp(20px, 5vw, 72px)' }}>
          





































          
        </div>
      </section>

      {/* Final CTA */}
    </>);

};