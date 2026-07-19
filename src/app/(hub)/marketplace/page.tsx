import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { AGENT_DEPARTMENTS } from "@/lib/brand";
import { AGENT_MONTHLY_USD } from "@/lib/pricing";
import Link from "next/link";
import { Wand2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const templates = await prisma.agentTemplate.findMany({ orderBy: { department: "asc" } });

  return (
    <>
      <Header
        title="Agent Marketplace"
        subtitle={`Deploy agents at $${AGENT_MONTHLY_USD}/mo each — BloodstockAI pack stays available`}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-bs-muted">
          + integration fees when systems are connected ·{" "}
          <Link href="/billing" className="text-bs-accent hover:underline">
            Pricing details
          </Link>
        </p>
        <Link href="/agents/new" className="bs-btn-primary gap-2">
          <Wand2 className="h-4 w-4" /> Custom Agent Builder
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AGENT_DEPARTMENTS.map((dept) => (
          <div key={dept.id} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{dept.name}</p>
              <span className="rounded-full bg-bs-accent/10 px-2 py-0.5 text-[10px] text-bs-accent">
                ${AGENT_MONTHLY_USD}/mo
              </span>
            </div>
            <p className="mt-2 text-sm text-bs-muted">{dept.description}</p>
            <ul className="mt-3 space-y-1">
              {dept.capabilities.slice(0, 4).map((cap) => (
                <li key={cap} className="text-[12px] text-bs-muted">
                  • {cap}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h2 className="mb-4 text-sm font-medium text-bs-muted">Available templates</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <div key={t.id} className="glass glass-hover rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-bs-accent">{t.department}</p>
              </div>
              <div className="text-right">
                <div className="ml-auto h-8 w-8 rounded-lg" style={{ backgroundColor: t.avatarColor }} />
                <p className="mt-2 text-[11px] text-bs-accent">${AGENT_MONTHLY_USD}/mo</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-bs-muted">{t.description}</p>
            {t.industryPack && (
              <p className="mt-2 text-[11px] text-bs-accent">Pack: {t.industryPack}</p>
            )}
            <Link href={`/agents/new?template=${t.slug}`} className="bs-btn-ghost mt-4 w-full">
              Deploy agent
            </Link>
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-bs-muted">No templates seeded yet. Run npm run db:setup.</p>
        )}
      </div>
    </>
  );
}
