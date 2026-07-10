import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, Cpu, CheckSquare, Star, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import slideFoaling from "@/assets/hero-slides/foaling-season.png.asset.json";
import slideStallion from "@/assets/hero-slides/stallion-finder.png.asset.json";
import slideFoaling2 from "@/assets/hero-slides/foaling-season-2.png.asset.json";
import slideYearling from "@/assets/hero-slides/yearling-sale-season.png.asset.json";
import slideJuneMarket from "@/assets/hero-slides/june-market-review-2026.png.asset.json";

const HERO_SLIDES = [
  { src: slideJuneMarket.url, alt: "June 2026 Market Review — Global market, one powerful month" },
  { src: slideYearling.url, alt: "Yearling Sale Season — Europe & USA" },
  { src: slideFoaling.url, alt: "BLOODSTOCK.AI — Australian Foaling Season" },
  { src: slideStallion.url, alt: "Stallion Finder — AI-Powered Matching" },
  { src: slideFoaling2.url, alt: "Australian Foaling Season — Plan Ahead" },
];

export const Hero = () => {
  const autoplay = useRef(Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" }, [autoplay.current]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  const cards = [
    {
      icon: Upload,
      title: "Submit your catalogue or footage",
      desc: "Upload any auction PDF or video file. BloodstockAI accepts all major auction house formats and standard video files.",
      badge: "01"
    },
    {
      icon: Cpu,
      title: "AI analysis runs automatically",
      desc: "Every page, every frame is processed against global pedigree databases, historical sales records, and biomechanical benchmarks.",
      badge: "02"
    },
    {
      icon: CheckSquare,
      title: "Review your report",
      desc: "Receive a structured report with ranked lots, valuation ranges, pedigree summaries, and conformational notes — ready for your review.",
      badge: "03"
    }
  ];

  return (
    <section className="relative bg-background overflow-hidden">
      {/* Hero Slideshow — auto-rotating, responsive */}
      <div className="relative w-full overflow-hidden bg-white px-1.5 sm:px-8 lg:px-16 pt-20 sm:pt-28 lg:pt-28 pb-6 sm:pb-10">
        <div ref={emblaRef} className="overflow-hidden rounded-lg sm:rounded-2xl max-w-[1400px] mx-auto">
          <div className="flex">
            {HERO_SLIDES.map((slide, i) => (
              <div key={i} className="relative flex-[0_0_100%] min-w-0 px-0 sm:px-2">
                <img
                  src={slide.src}
                  alt={slide.alt}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  decoding={i === 0 ? "sync" : "async"}
                  width={1400}
                  height={700}
                  className="w-full block bg-white rounded-md sm:rounded-xl aspect-[3/2] sm:aspect-[16/9] lg:aspect-[2/1] object-contain"
                  style={{ maxHeight: '620px' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 z-10">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                selectedIndex === i ? "w-8 bg-secondary" : "w-2 bg-foreground/30 hover:bg-foreground/50"
              }`}
            />
          ))}
        </div>

        {/* Prev / Next */}
        <button
          aria-label="Previous slide"
          onClick={() => emblaApi?.scrollPrev()}
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border hover:bg-background transition-colors z-10"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
        </button>
        <button
          aria-label="Next slide"
          onClick={() => emblaApi?.scrollNext()}
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border hover:bg-background transition-colors z-10"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content below image */}
      <div className="container relative z-20 mx-auto text-center" style={{ paddingTop: 'clamp(32px, 5vw, 64px)', paddingBottom: 'clamp(40px, 8vw, 80px)', paddingLeft: 'clamp(16px, 5vw, 72px)', paddingRight: 'clamp(16px, 5vw, 72px)' }}>
        <div className="max-w-[1100px] mx-auto animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(14px, 3vw, 24px)' }}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-secondary/30 bg-secondary/5">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="uppercase text-secondary font-medium" style={{ fontSize: 'clamp(0.55rem, 1.2vw, 0.68rem)', letterSpacing: '0.08em' }}>
              The Process
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-luxury font-bold text-foreground uppercase px-1"
            style={{ fontSize: 'clamp(1.35rem, 4.5vw, 3rem)', lineHeight: '1.2', letterSpacing: '-0.01em' }}>
            From upload to insight
            <br />
            <span className="text-secondary">in three steps.</span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-muted-foreground max-w-[580px] mx-auto font-light font-body px-1"
            style={{ fontSize: 'clamp(0.8rem, 1.5vw, 0.95rem)', lineHeight: '1.6' }}>
            From catalogue PDF to ranked shortlist. From breeze-up video to biomechanical report.
            <br />
            <span className="font-semibold text-foreground">In minutes.</span>
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center justify-center w-full max-w-lg sm:max-w-none mx-auto" style={{ gap: 'clamp(8px, 1.5vw, 16px)', paddingTop: 'clamp(4px, 1.5vw, 16px)' }}>
            <Link to="/auth" className="w-full sm:w-auto">
              <Button
                variant="premium"
                size="lg"
                className="w-full sm:w-auto uppercase"
                style={{ fontSize: 'clamp(0.6rem, 1.2vw, 0.68rem)', letterSpacing: '0.08em', padding: 'clamp(10px, 2vw, 16px) clamp(16px, 3vw, 32px)', minHeight: '44px' }}>
                Explore the Platform
                <ArrowRight className="ml-2 w-4 h-4 flex-shrink-0" />
              </Button>
            </Link>
            <a
              href="#how-it-works"
              className="text-secondary/70 hover:text-secondary transition-colors uppercase"
              style={{ fontSize: 'clamp(0.6rem, 1.2vw, 0.68rem)', letterSpacing: '0.08em' }}>
              Learn how it works →
            </a>
          </div>

          {/* 3 Process Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 text-left max-w-5xl mx-auto w-full" style={{ paddingTop: 'clamp(12px, 3vw, 28px)', gap: 'clamp(10px, 1.8vw, 18px)' }}>
            {cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="group relative flex flex-col h-full rounded-lg bg-card/90 backdrop-blur-sm border border-border hover:border-secondary/30 transition-all duration-500 overflow-hidden"
                  style={{ padding: 'clamp(14px, 2.2vw, 18px)' }}>
                  <span className="absolute top-2 right-4 font-bold text-secondary/[0.10] font-luxury select-none pointer-events-none leading-none" style={{ fontSize: 'clamp(2.5rem, 6vw, 3.5rem)' }}>
                    {card.badge}
                  </span>
                  <div className="flex items-start justify-between gap-2 mb-2 sm:mb-2.5">
                    <Icon className="text-secondary flex-shrink-0" style={{ width: 'clamp(22px, 2.8vw, 26px)', height: 'clamp(22px, 2.8vw, 26px)' }} />
                  </div>
                  <h3 className="font-bold text-foreground mb-1.5 sm:mb-2 font-luxury leading-snug relative z-10" style={{ fontSize: 'clamp(1rem, 1.4vw, 1.1rem)' }}>
                    {card.title}
                  </h3>
                  <p className="text-muted-foreground font-body relative z-10" style={{ fontSize: 'clamp(0.85rem, 1.05vw, 0.88rem)', lineHeight: '1.6' }}>{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </section>
  );
};
