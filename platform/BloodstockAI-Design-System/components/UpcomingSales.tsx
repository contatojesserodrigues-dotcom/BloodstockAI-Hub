import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import { JULY_SALES, getLiveJulySales } from "@/data/julySales";
import type { SaleStatus } from "@/lib/salesCalendar";

const CATEGORY_TAGS = ["All", "Breeding Stock", "Yearlings", "HIT", "Stores", "Broodmares", "2YOs"];

export const UpcomingSales = () => {
  const [country, setCountry] = useState<string>("All");
  const [tag, setTag] = useState<string>("All");

  const sales = useMemo(() => getLiveJulySales(), []);

  const countries = useMemo(
    () => ["All", ...Array.from(new Set(sales.map((s) => s.country)))],
    [sales],
  );

  const filtered = sales.filter((s) => {
    if (country !== "All" && s.country !== country) return false;
    if (tag !== "All" && !s.category.toLowerCase().includes(tag.toLowerCase())) return false;
    return true;
  });

  const statusPill = (status: SaleStatus) =>
    status === "Active"
      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
      : status === "Ended"
      ? "bg-white/10 text-white/50 border border-white/15 line-through"
      : "bg-white/5 text-white/70 border border-white/15";

  const statusLabel = (status: SaleStatus) =>
    status === "Coming Soon" ? "Coming Soon" : status === "Active" ? "Active" : "Ended";

  return (
    <section className="relative py-14 md:py-20 bg-[hsl(var(--navy-deep))] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/[0.04] to-transparent pointer-events-none" />
      <div className="container mx-auto px-4 sm:px-6 relative">
        <div className="text-center max-w-3xl mx-auto mb-8 md:mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary mb-3 flex items-center justify-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Live · Sales Calendar
          </p>
          <h2 className="text-2xl md:text-4xl font-light text-white leading-tight tracking-[-0.02em]">
            July <span className="text-secondary">Sales Calendar</span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-white/70">
            Access upcoming global sales and download BloodstockAI analysed catalogues when available.
          </p>
          <p className="mt-2 text-xs md:text-sm text-white/50 italic">
            Plan your next purchase with deeper pedigree, performance, market and visual intelligence.
          </p>
          <div className="mt-6 h-px w-24 mx-auto bg-gradient-to-r from-transparent via-secondary to-transparent" />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-8">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="bg-white/5 border border-white/15 text-white text-xs md:text-sm rounded-md px-3 py-2 focus:outline-none focus:border-secondary/60 hover:border-white/30 transition-colors"
          >
            {countries.map((c) => (
              <option key={c} value={c} className="bg-[hsl(var(--navy-deep))] text-white">
                {c === "All" ? "All countries" : c}
              </option>
            ))}
          </select>
          <div className="hidden md:flex flex-wrap items-center gap-1.5">
            {CATEGORY_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                  tag === t
                    ? "bg-secondary text-[hsl(var(--navy-deep))] border-secondary"
                    : "bg-transparent text-white/70 border-white/15 hover:border-secondary/50 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="md:hidden bg-white/5 border border-white/15 text-white text-xs rounded-md px-3 py-2 focus:outline-none focus:border-secondary/60"
          >
            {CATEGORY_TAGS.map((t) => (
              <option key={t} value={t} className="bg-[hsl(var(--navy-deep))] text-white">
                {t === "All" ? "All categories" : t}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden lg:block rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.18em] text-secondary/90 border-b border-secondary/20">
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold">Country</th>
                <th className="px-5 py-4 font-semibold">Sale</th>
                <th className="px-5 py-4 font-semibold">Category</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.slug}
                  className={`group transition-colors hover:bg-secondary/[0.06] ${
                    i !== filtered.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <td className="px-5 py-4 text-sm font-medium text-white whitespace-nowrap">{s.date}</td>
                  <td className="px-5 py-4 text-sm text-white/85">
                    <span className="mr-2 text-lg leading-none align-middle">{s.flag}</span>
                    <span className="align-middle">{s.country}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-semibold text-white group-hover:text-secondary transition-colors">{s.name}</div>
                    <div className="text-[11px] text-white/50 mt-0.5">{s.location}</div>
                  </td>
                  <td className="px-5 py-4 text-xs text-white/70 max-w-[260px]">{s.category}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${statusPill(s.status)}`}>
                      {statusLabel(s.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      to={`/analyzed-catalogs?auction=${s.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary border border-secondary/50 hover:bg-secondary hover:text-[hsl(var(--navy-deep))] transition-all rounded-md px-3.5 py-2"
                    >
                      Get Analysed Catalogue
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-white/50">
                    No sales match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden space-y-3">
          {filtered.map((s) => (
            <div key={s.slug} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-secondary/90 font-semibold">{s.date}</p>
                  <h3 className="text-base font-semibold text-white mt-0.5 leading-tight">
                    <span className="mr-1.5">{s.flag}</span>
                    {s.name}
                  </h3>
                  <p className="text-[11px] text-white/50 mt-0.5">{s.location}</p>
                </div>
                <span className={`shrink-0 inline-block text-[9px] uppercase tracking-wider px-2 py-1 rounded-full ${statusPill(s.status)}`}>
                  {statusLabel(s.status)}
                </span>
              </div>
              <p className="text-xs text-white/70 mb-3">{s.category}</p>
              <Link
                to={`/analyzed-catalogs?auction=${s.slug}`}
                className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-secondary border border-secondary/50 hover:bg-secondary hover:text-[hsl(var(--navy-deep))] transition-all rounded-md px-3 py-2.5"
              >
                Get Analysed Catalogue
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-white/50 py-8">No sales match the selected filters.</p>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-white/55">
            Single analyses and advisory services are also available for selected lots.
          </p>
          <Link
            to="/analyzed-catalogs"
            className="inline-flex items-center gap-1.5 mt-3 text-xs uppercase tracking-[0.2em] text-secondary hover:text-secondary/80 transition-colors"
          >
            View All Sales <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};
