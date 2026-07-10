import { motion } from "framer-motion";
import { PLATFORM_METRICS } from "@/data/landing";
import { LandingSection } from "./LandingSection";
import { WorldPresenceMap } from "./WorldPresenceMap";
import arqanaLogo from "@/assets/auction-houses/reference-arqana.png";
import magicMillionsLogo from "@/assets/auction-houses/reference-magic-millions.png";
import keenelandLogo from "@/assets/auction-houses/reference-keeneland.png";
import inglisLogo from "@/assets/auction-houses/reference-inglis.png";
import fasigTiptonLogo from "@/assets/auction-houses/reference-fasig-tipton.png";
import tattersallsLogo from "@/assets/auction-houses/reference-tattersalls.png";

const COVERED_SALES = [
  { name: "Arqana", logo: arqanaLogo, size: "max-h-14" },
  { name: "Magic Millions", logo: magicMillionsLogo, size: "max-h-14" },
  { name: "Keeneland", logo: keenelandLogo, size: "max-h-14" },
  { name: "Inglis", logo: inglisLogo, size: "max-h-11" },
  { name: "Fasig-Tipton", logo: fasigTiptonLogo, size: "max-h-11" },
  { name: "Tattersalls", logo: tattersallsLogo, size: "max-h-16" },
] as const;

const formatNum = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : n.toString();

export const GlobalTrustSection = () => {
  const { totalVisitors, totalCountries, activeUsers, clients, totalSessions, growthPercent, regions } =
    PLATFORM_METRICS;

  const globalStats = [
    { label: "Total Visitors", value: formatNum(totalVisitors) },
    { label: "Countries", value: totalCountries.toString() },
    { label: "Active Users", value: formatNum(activeUsers) },
    { label: "Clients", value: clients.toString() },
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
        <div className="grid grid-cols-2 items-center gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
          {COVERED_SALES.map((sale) => (
            <div key={sale.name} className="group flex h-16 items-center justify-center">
              <img
                src={sale.logo}
                alt={`${sale.name} sale coverage`}
                title={sale.name}
                className={`${sale.size} max-w-[138px] object-contain mix-blend-multiply grayscale opacity-45 transition-all duration-300 ease-out group-hover:scale-[1.04] group-hover:grayscale-0 group-hover:opacity-100`}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
        {globalStats.map((s) => (
          <motion.div
            key={s.label}
            initial={false}
            className="rounded-xl bg-white border border-border/40 p-4 md:p-5 text-center premium-card"
          >
            <p className="text-2xl md:text-3xl font-light text-foreground">{s.value}</p>
            <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground mt-1">
              {s.label}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6 lg:gap-8 items-stretch">
        <motion.div
          initial={false}
          className="rounded-2xl bg-white border border-border/50 p-3 premium-card min-h-[340px]"
        >
          <WorldPresenceMap />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 content-center">
          {regions.map((r) => (
            <motion.div
              key={r.name}
              initial={false}
              className="flex items-center justify-between rounded-xl bg-white border border-border/50 px-4 py-3.5 premium-card"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">{r.flag}</span>
                <span className="text-sm font-medium truncate">{r.name}</span>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-sm font-medium">{formatNum(r.users)}</p>
                <p className="text-[10px] text-muted-foreground">{formatNum(r.sessions)} sessions</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </LandingSection>
  );
};
