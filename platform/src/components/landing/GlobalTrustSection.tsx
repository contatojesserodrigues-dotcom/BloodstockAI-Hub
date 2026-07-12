import { motion } from "framer-motion";
import { PLATFORM_METRICS } from "@/data/landing";
import { LandingSection } from "./LandingSection";
import arqanaLogo from "@/assets/auction-houses/reference-arqana.png";
import magicMillionsLogo from "@/assets/auction-houses/reference-magic-millions.png";
import keenelandLogo from "@/assets/auction-houses/reference-keeneland.png";
import inglisLogo from "@/assets/auction-houses/reference-inglis.png";
import fasigTiptonLogo from "@/assets/auction-houses/reference-fasig-tipton.png";
import tattersallsLogo from "@/assets/auction-houses/reference-tattersalls.png";
import obsLogo from "@/assets/auction-houses/reference-obs-quality-feeds.png";
import goffsLogo from "@/assets/auction-houses/reference-goffs.png";

const COVERED_SALES = [
  { name: "Arqana", logo: arqanaLogo, size: "max-h-14" },
  { name: "Magic Millions", logo: magicMillionsLogo, size: "max-h-14" },
  { name: "Keeneland", logo: keenelandLogo, size: "max-h-14" },
  { name: "Inglis", logo: inglisLogo, size: "max-h-11" },
  { name: "Fasig-Tipton", logo: fasigTiptonLogo, size: "max-h-11" },
  { name: "Tattersalls", logo: tattersallsLogo, size: "max-h-16" },
  { name: "OBS", logo: obsLogo, size: "max-h-12" },
  { name: "Goffs", logo: goffsLogo, size: "max-h-12" },
] as const;

const LOGO_HOVER_CLASS =
  "max-w-[138px] object-contain mix-blend-multiply grayscale opacity-45 transition-all duration-300 ease-out group-hover:scale-[1.04] group-hover:grayscale-0 group-hover:opacity-100";

const formatNum = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".0", "")}k` : n.toLocaleString();

export const GlobalTrustSection = () => {
  const { totalSessions, growthPercent, countries } = PLATFORM_METRICS;
  const maxUsers = countries[0]?.activeUsers ?? 1;
  const totalActive = countries.reduce((sum, c) => sum + c.activeUsers, 0);

  const summaryStats = [
    { label: "Countries", value: countries.length.toString() },
    { label: "Active Users", value: formatNum(totalActive) },
    { label: "Sessions", value: formatNum(totalSessions) },
    { label: "Growth", value: `+${growthPercent}%` },
  ];

  return (
    <LandingSection
      eyebrow="Global Reach"
      title="Trusted by Bloodstock Professionals Worldwide."
      subtitle="When the margin between an exceptional purchase and an expensive mistake is one decision, professionals choose deeper intelligence."
      className="py-16 md:py-24 border-y border-border/60 bg-[hsl(210_16%_98%)]"
    >
      <div className="mb-12 border-y border-border/50 py-7 md:py-8">
        <p className="mb-6 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Sales intelligence coverage across leading global auction markets
        </p>
        <div className="grid grid-cols-2 items-center gap-x-6 gap-y-7 sm:grid-cols-4 lg:grid-cols-8">
          {COVERED_SALES.map((sale) => (
            <div key={sale.name} className="group flex h-16 items-center justify-center">
              <img
                src={sale.logo}
                alt={`${sale.name} sale coverage`}
                title={sale.name}
                className={`${sale.size} ${LOGO_HOVER_CLASS}`}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 max-w-3xl mx-auto">
        {summaryStats.map((s) => (
          <motion.div
            key={s.label}
            initial={false}
            className="rounded-xl bg-white border border-border/40 p-4 text-center premium-card"
          >
            <p className="text-2xl md:text-3xl font-light text-foreground">{s.value}</p>
            <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground mt-1">
              {s.label}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="max-w-xl mx-auto rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden premium-card">
        <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Active users by country</p>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Last 28 days</span>
        </div>
        <div className="px-5 py-2">
          <div className="grid grid-cols-[1fr_auto] gap-x-4 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-dotted border-border/60 pb-2 mb-1">
            <span>Country</span>
            <span className="text-right">Active users</span>
          </div>
          <ul className="divide-y divide-border/30">
            {countries.map((c, i) => (
              <motion.li
                key={c.name}
                initial={{ opacity: 0, x: -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="py-3"
              >
                <div className="grid grid-cols-[1fr_auto] gap-x-4 items-center mb-1.5">
                  <span className="text-sm text-foreground flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="text-sm font-medium tabular-nums">{formatNum(c.activeUsers)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[hsl(217_91%_60%)] transition-all duration-500"
                    style={{ width: `${Math.max(8, (c.activeUsers / maxUsers) * 100)}%` }}
                  />
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </LandingSection>
  );
};
