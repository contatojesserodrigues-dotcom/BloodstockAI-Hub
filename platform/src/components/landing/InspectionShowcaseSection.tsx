import { motion } from "framer-motion";
import {
  ArrowDown,
  Camera,
  ChevronUp,
  FileText,
  Scan,
  Stethoscope,
  ThumbsUp,
  TrendingUp,
  Upload,
  Video,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LandingSection } from "./LandingSection";
import { PremiumBadge } from "./PremiumBadge";
import { cn } from "@/lib/utils";

const MOTION_MAP = "/landing/interactive-motion-mapping-hq.png";
const CONFORMATION_HORSE = "/landing/bloodstock-conformation-realistic.png";
const BREEZEUP_HERO = "/landing/bloodstock-breezeup-realistic.png";

const conformationRows = [
  { label: "Shoulder angle", value: "~47° — within ideal" },
  { label: "Front pastern angle (L/R)", value: "~52° / ~50° — within ideal" },
  { label: "Hind pastern angle", value: "~53–55° — within ideal" },
  { label: "Hock angle", value: "~152° — within ideal" },
  { label: "Hoof-pastern axis (front)", value: "Mildly broken-forward — mild deviation", warn: true },
  { label: "Front heel height (L/R)", value: "Low — notable deviation", warn: true },
  { label: "Body length : withers height", value: "~1.05:1 — within ideal" },
  { label: "Croup angle", value: "~23° — within ideal" },
];

const roiProjection = [
  { year: "Y1", value: 0 },
  { year: "Y2", value: 18 },
  { year: "Y3", value: 42 },
  { year: "Y4", value: 68 },
  { year: "Y5", value: 95 },
];

const breezeMetrics = [
  { label: "Stride Angle", value: "116°", note: "Excellent" },
  { label: "Stride Length", value: "3.74m", note: "Excellent" },
  { label: "Extension", value: "150%", note: "of body length" },
  { label: "Balance", value: "80/20", note: "Front-driven" },
  { label: "Symmetry", value: "Balanced", note: "No asymmetries" },
  { label: "Soundness", value: "Sound", note: "No issues" },
];

const panelClass = "premium-card overflow-hidden bg-white";

const inspectionSteps = [
  { icon: Camera, label: "Upload Photos" },
  { icon: Video, label: "Upload Videos" },
  { icon: Scan, label: "Computer Vision Analysis" },
  { icon: Upload, label: "Biomechanics Evaluation" },
  { icon: FileText, label: "Conformation Assessment" },
  { icon: FileText, label: "Professional Report" },
];

export const InspectionShowcaseSection = () => (
  <LandingSection
    id="inspection-showcase"
    eyebrow="Sale Inspection Intelligence"
    title="Real inspection outputs. Real auction decisions."
    subtitle="Interactive motion mapping, conformation scoring, market estimates and ROI projection — exactly as professionals use inside the platform."
    className="py-16 md:py-24 bg-[hsl(210_20%_98%)] border-y border-border/30"
  >
    <div className="max-w-6xl mx-auto space-y-5 md:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-2xl border border-border/50 bg-white p-5 shadow-[var(--shadow-card)] md:p-7"
      >
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground md:text-center">
          From raw footage to institutional-grade inspection reports — powered by computer vision
          and domain expertise.
        </p>
        <div className="grid lg:grid-cols-6 lg:gap-3">
          {inspectionSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="relative">
                <div className="flex items-center gap-4 py-2.5 lg:flex-col lg:gap-3 lg:px-1 lg:py-0 lg:text-center">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--navy-deep))]">
                    <Icon className="h-4 w-4 text-secondary" />
                  </div>
                  <p className="text-sm font-bold lg:text-xs">{step.label}</p>
                </div>
                {index < inspectionSteps.length - 1 && (
                  <div className="flex h-7 items-center pl-[14px] lg:absolute lg:-right-4 lg:top-2 lg:h-auto lg:pl-0">
                    <ArrowDown className="h-4 w-4 text-border lg:-rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 1 — Original Interactive Motion Mapping interface, enhanced at 2× resolution */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="overflow-hidden rounded-2xl border border-border/50 bg-white shadow-[var(--shadow-card)]"
      >
        <img
          src={MOTION_MAP}
          alt="Interactive Motion Mapping with joint tracking, live angles, frame controls and anatomical reference"
          className="block h-auto w-full"
          width={2048}
          height={1602}
          loading="eager"
          decoding="async"
        />
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-5 md:gap-6">
        {/* 2 — Conformation analysis (recreated) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className={panelClass}
        >
          <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">#2 · Full Body Video</p>
              <p className="text-[10px] text-muted-foreground">27/06/2026 · Conformation assessment</p>
            </div>
            <PremiumBadge variant="recommended">76/100 · Good</PremiumBadge>
          </div>
          <div className="relative aspect-[3/2] bg-muted/30 border-b border-border/20 overflow-hidden">
            <img
              src={CONFORMATION_HORSE}
              alt="Realistic standing thoroughbred used for conformation assessment"
              className="w-full h-full object-contain"
              loading="lazy"
            />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 600" aria-hidden>
              <g fill="none" stroke="hsl(43 76% 48%)" strokeWidth="3" opacity="0.75">
                {/* Neck, topline and pelvis */}
                <path d="M151 108 218 142 302 176 438 194 590 204 744 188 794 151" />
                {/* Near forelimb: shoulder → elbow → knee → fetlock → hoof */}
                <path d="M302 176 326 308 344 411 341 510 350 564" />
                {/* Far forelimb */}
                <path d="M438 194 430 320 438 416 430 514 423 563" />
                {/* Far hindlimb */}
                <path d="M590 204 632 305 688 400 690 507 675 561" />
                {/* Near hindlimb */}
                <path d="M744 188 718 292 724 402 742 506 753 566" />
              </g>
              {[
                [151, 108, "#22c55e"], [218, 142, "#22c55e"], [302, 176, "#eab308"],
                [438, 194, "#22c55e"], [590, 204, "#22c55e"], [744, 188, "#f97316"],
                [794, 151, "#22c55e"],
                [326, 308, "#22c55e"], [344, 411, "#eab308"], [341, 510, "#22c55e"],
                [350, 564, "#22c55e"],
                [430, 320, "#22c55e"], [438, 416, "#f97316"], [430, 514, "#eab308"],
                [423, 563, "#22c55e"],
                [632, 305, "#22c55e"], [688, 400, "#eab308"], [690, 507, "#eab308"],
                [675, 561, "#ef4444"],
                [718, 292, "#f97316"], [724, 402, "#eab308"], [742, 506, "#22c55e"],
                [753, 566, "#22c55e"],
              ].map(([cx, cy, fill], index) => (
                <circle key={index} cx={cx} cy={cy} r="8" fill={fill} stroke="white" strokeWidth="2" />
              ))}
            </svg>
            <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5">
              {[
                { c: "bg-emerald-500", l: "Excellent" },
                { c: "bg-amber-400", l: "Good" },
                { c: "bg-orange-400", l: "Attention" },
                { c: "bg-red-500", l: "Refer" },
              ].map((x) => (
                <span key={x.l} className="inline-flex items-center gap-1 text-[9px] bg-white/90 backdrop-blur px-1.5 py-0.5 rounded-md border border-border/40">
                  <span className={cn("w-1.5 h-1.5 rounded-full", x.c)} />
                  {x.l}
                </span>
              ))}
            </div>
          </div>
          <div className="divide-y divide-border/30 max-h-[220px] overflow-y-auto">
            {conformationRows.map((row) => (
              <div key={row.label} className="px-4 py-2.5 flex justify-between gap-3 text-[11px]">
                <span className="text-muted-foreground shrink-0">{row.label}</span>
                <span className={cn("text-right font-medium", row.warn && "text-amber-800")}>{row.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 3 — Market Estimate & ROI (recreated) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className={panelClass}
        >
          <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-secondary" />
              <p className="text-sm font-medium">Market Estimate & ROI Projection</p>
            </div>
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="p-4 space-y-3">
            <p className="text-[10px] text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Preliminary estimate — refines automatically as you add pedigree research.
            </p>

            <div className="space-y-2">
              {[
                { tier: "Conservative", range: "$104,000 – $189,000", sub: "Soft market, limited interest", bg: "bg-emerald-700" },
                { tier: "Base Estimate", range: "$189,000 – $275,000", sub: "Typical sale outcome for profile", bg: "bg-[hsl(var(--navy-deep))]" },
                { tier: "Upside", range: "$275,000 – $416,000", sub: "Strong demand, competitive bidding", bg: "bg-secondary" },
              ].map((t) => (
                <div key={t.tier} className={cn("rounded-xl px-4 py-3 text-white", t.bg)}>
                  <p className="text-[9px] uppercase tracking-wider opacity-80">{t.tier}</p>
                  <p className="text-lg font-light tracking-[-0.02em] mt-0.5">{t.range}</p>
                  <p className="text-[10px] opacity-75 mt-0.5">{t.sub}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              Confidence: MEDIUM
            </p>

            <div className="rounded-xl border border-red-200/60 bg-red-50/40 p-3">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-foreground">Commercial Price Adjustment</p>
                <span className="text-lg font-light text-red-700">-3%</span>
              </div>
              <div className="space-y-1.5 text-[10px]">
                <p className="flex items-center gap-1.5 text-emerald-800">
                  <ThumbsUp className="w-3 h-3" /> Athletic / scopey frame <span className="ml-auto font-medium">+3%</span>
                </p>
                <p className="flex items-center gap-1.5 text-red-800">
                  <Stethoscope className="w-3 h-3" /> Vet radiographs advised <span className="ml-auto font-medium">-6%</span>
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Client ROI Projection</p>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={roiProjection}>
                    <defs>
                      <linearGradient id="roiFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(43 76% 48%)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="hsl(43 76% 48%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="year" tick={{ fontSize: 9, fill: "hsl(222 16% 46%)" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={(v: number) => [`${v}%`, "Projected ROI"]} contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="value" stroke="hsl(43 76% 48%)" strokeWidth={1.5} fill="url(#roiFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">5-year racing & resale upside vs. purchase price</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 4 — Breeze-Up / Training Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.12 }}
        className={cn(panelClass, "overflow-hidden")}
      >
        <div className="px-4 py-3 border-b border-border/30 flex flex-wrap items-center justify-between gap-2">
          <div>
              <p className="text-sm font-bold">Breeze-Up & Training Analysis</p>
            <p className="text-[10px] text-muted-foreground">Lot 49 · Woodland Lodge · Stride & balance intelligence</p>
          </div>
          <div className="flex gap-2">
            <PremiumBadge variant="highValue">Key Highlight</PremiumBadge>
            <PremiumBadge variant="roi">Strong ROI</PremiumBadge>
          </div>
        </div>

        <div className="relative aspect-[3/2] overflow-hidden bg-[hsl(var(--navy-deep))]">
          <img
            src={BREEZEUP_HERO}
            alt="Thoroughbred at gallop — breeze-up biomechanics analysis"
            className="h-full w-full object-cover object-center"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 600" aria-label="Breeze-up stride angle and biomechanics measurements">
            <defs>
              <filter id="measurement-shadow">
                <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.9" />
              </filter>
            </defs>

            {/* Full-extension triangle and ground span */}
            <g fill="none" stroke="#f2c94c" strokeWidth="4" filter="url(#measurement-shadow)">
              <path d="M38 525 430 252 842 493" />
              <path d="M38 525 842 493" strokeWidth="2.5" />
              <path d="M430 252 A150 150 0 0 1 557 333" strokeWidth="3" />
            </g>

            {/* Spine and body reference */}
            <g fill="none" stroke="#67d9e8" strokeWidth="3" strokeDasharray="10 7" filter="url(#measurement-shadow)">
              <path d="M300 250 590 273 688 292" />
            </g>

            {/* Rear limb kinematic chain */}
            <g fill="none" stroke="#f2c94c" strokeWidth="3" filter="url(#measurement-shadow)">
              <path d="M357 282 238 401 125 490 38 525" />
              {/* Front limb kinematic chain */}
              <path d="M603 274 671 365 755 443 842 493" />
              {/* Shoulder and hip vertical references */}
              <path d="M603 274 603 365" />
              <path d="M357 282 357 365" />
            </g>

            {/* Joint markers */}
            {[
              [430, 252], [357, 282], [238, 401], [125, 490], [38, 525],
              [603, 274], [671, 365], [755, 443], [842, 493],
              [300, 250], [590, 273], [688, 292],
            ].map(([cx, cy], index) => (
              <circle key={index} cx={cx} cy={cy} r="7" fill="#f2c94c" stroke="#111827" strokeWidth="3" />
            ))}

            {/* Frame title */}
            <g>
              <rect x="14" y="14" width="255" height="36" rx="3" fill="rgba(5,12,10,.86)" stroke="#f2c94c" strokeWidth="2" />
              <text x="29" y="38" fill="white" fontSize="17" fontWeight="700">Frame 6: Full Extension</text>
            </g>

            {/* Balance bar */}
            <g>
              <rect x="330" y="14" width="240" height="42" rx="3" fill="rgba(5,12,10,.86)" stroke="#f2c94c" strokeWidth="2" />
              <rect x="342" y="22" width="174" height="8" fill="#67d9e8" />
              <rect x="516" y="22" width="42" height="8" fill="#f2c94c" />
              <text x="342" y="47" fill="white" fontSize="13" fontWeight="700">Front 80%</text>
              <text x="454" y="47" fill="#f2c94c" fontSize="13" fontWeight="700">Rear 20% · Front-driven</text>
            </g>

            {/* Left analysis panel */}
            <g>
              <rect x="14" y="65" width="305" height="164" rx="4" fill="rgba(5,12,10,.86)" stroke="#f2c94c" strokeWidth="2" />
              <text x="28" y="88" fill="#f2c94c" fontSize="15" fontWeight="700">BLOODSTOCKAI® BIOMECHANICS</text>
              <text x="28" y="110" fill="white" fontSize="13">Shoulder: 163°   |   Elbow: 130°</text>
              <text x="28" y="130" fill="white" fontSize="13">Hip: 161°   |   Hock: 176°</text>
              <text x="28" y="150" fill="white" fontSize="13">Front Reach: 28°   |   Rear Drive: 30°</text>
              <text x="28" y="170" fill="white" fontSize="13">Topline: 1°   |   Span: 3.74m</text>
              <text x="28" y="190" fill="#f2c94c" fontSize="13" fontWeight="700">Extension: 150% body (Excellent)</text>
              <text x="28" y="210" fill="white" fontSize="13">Balance: 80/20 · Front-driven</text>
            </g>

            {/* Right biomechanics panel */}
            <g>
              <rect x="680" y="65" width="205" height="150" rx="4" fill="rgba(5,12,10,.86)" stroke="#f2c94c" strokeWidth="2" />
              <text x="695" y="89" fill="#f2c94c" fontSize="15" fontWeight="700">BIOMECHANICS</text>
              <text x="695" y="111" fill="white" fontSize="13">Shoulder: 163°</text>
              <text x="695" y="131" fill="white" fontSize="13">Hip: 161°</text>
              <text x="695" y="151" fill="white" fontSize="13">Hock: 176°</text>
              <text x="695" y="171" fill="white" fontSize="13">Span: 3.74m</text>
              <text x="695" y="191" fill="#f2c94c" fontSize="13" fontWeight="700">Extension: 150%</text>
            </g>

            {/* Measurement labels */}
            {[
              { x: 387, y: 235, w: 90, label: "Spine 1°" },
              { x: 326, y: 265, w: 82, label: "Hip 161°" },
              { x: 568, y: 257, w: 102, label: "Shoulder 163°" },
              { x: 190, y: 385, w: 94, label: "Knee 130°" },
              { x: 635, y: 350, w: 94, label: "Hock 176°" },
              { x: 18, y: 535, w: 100, label: "Drive 30°" },
              { x: 783, y: 503, w: 105, label: "Front 28°" },
              { x: 378, y: 510, w: 144, label: "Span: 3.74m" },
            ].map((item) => (
              <g key={item.label}>
                <rect x={item.x} y={item.y} width={item.w} height="24" rx="3" fill="rgba(5,12,10,.9)" stroke="#f2c94c" />
                <text x={item.x + item.w / 2} y={item.y + 17} textAnchor="middle" fill="white" fontSize="12" fontWeight="700">
                  {item.label}
                </text>
              </g>
            ))}

            <text
              x="447"
              y="385"
              textAnchor="middle"
              fill="#f2c94c"
              stroke="#111827"
              strokeWidth="5"
              paintOrder="stroke"
              fontSize="48"
              fontWeight="800"
            >
              116°
            </text>

            <g>
              <rect x="336" y="555" width="270" height="31" rx="3" fill="rgba(5,12,10,.92)" stroke="#f2c94c" strokeWidth="2" />
              <text x="471" y="576" textAnchor="middle" fill="#f2c94c" fontSize="14" fontWeight="800">
                EXTENSION: 150% BODY · EXCELLENT
              </text>
            </g>
          </svg>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-border/30">
          {breezeMetrics.map((m) => (
            <div key={m.label} className="bg-white px-3 py-3 text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{m.value}</p>
              <p className="text-[9px] text-secondary/90">{m.note}</p>
            </div>
          ))}
        </div>

        <div className="p-4 grid md:grid-cols-2 gap-4 border-t border-border/30">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Stride frames analysed</p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { f: "F2", ext: 110 },
                    { f: "F3", ext: 92 },
                    { f: "F5", ext: 66 },
                    { f: "F8", ext: 97 },
                  ]}
                  barSize={14}
                >
                  <XAxis dataKey="f" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Bar dataKey="ext" fill="hsl(222 47% 11%)" radius={[3, 3, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Market vs. purchase ROI</p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { label: "Purchase", v: 220 },
                    { label: "Conservative", v: 189 },
                    { label: "Base", v: 275 },
                    { label: "Upside", v: 416 },
                  ]}
                  layout="vertical"
                  barSize={8}
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 9 }} width={72} axisLine={false} tickLine={false} />
                  <Bar dataKey="v" fill="hsl(43 76% 48%)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </LandingSection>
);
