import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LandingSection } from "./LandingSection";

const marketTrend = [
  { m: "Jan", v: 380 },
  { m: "Feb", v: 410 },
  { m: "Mar", v: 395 },
  { m: "Apr", v: 428 },
  { m: "May", v: 445 },
  { m: "Jun", v: 462 },
];

const avgPrice = [
  { sale: "OBS", price: 185 },
  { sale: "KEE", price: 320 },
  { sale: "TAT", price: 275 },
  { sale: "GOF", price: 240 },
  { sale: "MM", price: 290 },
];

const bioDist = [
  { range: "70–80", n: 18 },
  { range: "80–85", n: 34 },
  { range: "85–90", n: 42 },
  { range: "90+", n: 28 },
];

const roiBySale = [
  { m: "Q1", roi: 12 },
  { m: "Q2", roi: 18 },
  { m: "Q3", roi: 22 },
  { m: "Q4", roi: 28 },
];

const growth = [
  { c: "US", g: 42 },
  { c: "UK", g: 38 },
  { c: "IE", g: 35 },
  { c: "AU", g: 28 },
  { c: "FR", g: 22 },
  { c: "JP", g: 18 },
];

const chartShell = "premium-card p-5 md:p-6";

const ChartBlock = ({
  title,
  subtitle,
  children,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay }}
    className={chartShell}
  >
    <p className="text-xs font-medium text-foreground tracking-[-0.01em]">{title}</p>
    {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 mb-4">{subtitle}</p>}
    {!subtitle && <div className="mb-4" />}
    {children}
  </motion.div>
);

export const LandingChartsSection = () => (
  <LandingSection
    eyebrow="Market Intelligence"
    title="Data-driven insight across every sale."
    subtitle="Fine-grained analytics on market movement, pedigree strength, biomechanics and client returns."
    className="py-16 md:py-24 border-y border-border/30 bg-white"
  >
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
      <ChartBlock title="Market Trend" subtitle="Average lot performance index" delay={0}>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={marketTrend}>
              <defs>
                <linearGradient id="mkt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(43 76% 48%)" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="hsl(43 76% 48%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 13% 91%)" />
              <XAxis dataKey="m" tick={{ fontSize: 10, fill: "hsl(222 16% 46%)" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(220 13% 91%)" }} />
              <Area type="monotone" dataKey="v" stroke="hsl(43 76% 48%)" strokeWidth={1.5} fill="url(#mkt)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock>

      <ChartBlock title="Average Sale Price" subtitle="By major auction house (000s)" delay={0.05}>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={avgPrice} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 13% 91%)" />
              <XAxis dataKey="sale" tick={{ fontSize: 10, fill: "hsl(222 16% 46%)" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Bar dataKey="price" fill="hsl(222 47% 11%)" radius={[4, 4, 0, 0]} opacity={0.88} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock>

      <ChartBlock title="Biomechanics Distribution" delay={0.1}>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bioDist} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 13% 91%)" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(222 16% 46%)" }} axisLine={false} tickLine={false} />
              <Bar dataKey="n" fill="hsl(43 76% 48%)" radius={[4, 4, 0, 0]} opacity={0.9} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock>

      <ChartBlock title="Pedigree Strength" subtitle="Score distribution" delay={0.12}>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bioDist}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220 13% 91%)" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(222 16% 46%)" }} axisLine={false} tickLine={false} />
              <Line type="monotone" dataKey="n" stroke="hsl(222 47% 11%)" strokeWidth={1.5} dot={{ r: 2, fill: "hsl(43 76% 48%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock>

      <ChartBlock title="ROI by Sale Cycle" delay={0.15}>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={roiBySale}>
              <Area type="monotone" dataKey="roi" stroke="hsl(222 47% 11%)" fill="hsl(222 47% 11% / 0.06)" strokeWidth={1.5} />
              <XAxis dataKey="m" tick={{ fontSize: 10, fill: "hsl(222 16% 46%)" }} axisLine={false} tickLine={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock>

      <ChartBlock title="Client Growth by Country" delay={0.18}>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={growth} layout="vertical" barSize={10}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="c" tick={{ fontSize: 10, fill: "hsl(222 16% 46%)" }} axisLine={false} tickLine={false} width={28} />
              <Bar dataKey="g" fill="hsl(43 76% 48%)" radius={[0, 4, 4, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock>
    </div>
  </LandingSection>
);
