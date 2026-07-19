import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getDashboardMetrics } from "@/lib/db/agent-actions";
import { getLiveAgents } from "@/lib/agent-service";
import { ChatInterface, N8nStatusBadge, TerminalFeed, TavilyLeadSearch, WorkflowTrigger } from "@/lib/dynamic-components";
import { formatCurrency } from "@/lib/utils";
import { Activity, Users, TrendingUp, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { PanelSkeleton } from "@/components/ui/loading-skeletons";
import { KuiperLogo } from "@/components/brand/KuiperLogo";
import { BRAND } from "@/lib/brand";

export const revalidate = 15;

export default async function DashboardPage() {
  const [metrics, agents] = await Promise.all([
    getDashboardMetrics(),
    getLiveAgents(),
  ]);

  const activeAgents = agents.filter((a) => String(a.status).toLowerCase() !== "idle").length;

  const stats = [
    { label: "Active Agents", value: metrics.source === "supabase" ? metrics.activeAgents : activeAgents, icon: Activity, href: "/agents" },
    { label: "Pending Approvals", value: metrics.pendingApprovals, icon: ShieldCheck, href: "/approvals" },
    { label: "Total Leads", value: metrics.totalLeads, icon: Users, href: "/leads" },
    { label: "Pipeline Value", value: formatCurrency(metrics.pipelineValue), icon: TrendingUp, href: "/crm" },
  ];

  return (
    <>
      <div className="mb-6 flex flex-col items-center gap-4 text-center sm:mb-8 sm:flex-row sm:items-center sm:text-left">
        <KuiperLogo variant="hero" priority className="justify-center sm:justify-start" />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-bs-text sm:text-2xl md:text-3xl">
            {BRAND.name}
          </h1>
          <p className="mt-1 text-sm text-bs-muted sm:text-base">{BRAND.tagline}</p>
        </div>
      </div>

      <Header title="Dashboard" subtitle="BloodstockAI team intact · Kuiper command center" />

      <div className="mb-6 grid grid-cols-1 gap-3 xs:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="glass glass-hover rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-bs-muted">{s.label}</p>
                <p className="mt-2 truncate text-xl font-light sm:text-2xl">{s.value}</p>
              </div>
              <s.icon className="h-5 w-5 shrink-0 text-bs-accent" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mb-6">
        <Suspense fallback={<PanelSkeleton className="h-40" />}>
          <TavilyLeadSearch />
        </Suspense>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
        <Suspense fallback={<PanelSkeleton className="h-28" />}>
          <WorkflowTrigger />
        </Suspense>
        <Suspense fallback={<PanelSkeleton className="h-14 w-full lg:w-56" />}>
          <N8nStatusBadge />
        </Suspense>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="mb-4 text-sm font-medium text-bs-muted">My Agents</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {agents.slice(0, 6).map((agent) => (
                <Link key={agent.slug} href={`/agents/${agent.slug}`} className="glass glass-hover flex items-center gap-3 rounded-xl p-3">
                  <AgentAvatar name={agent.name} color={agent.avatarColor} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{agent.name}</p>
                    <StatusBadge status={agent.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <Suspense fallback={<PanelSkeleton className="h-[500px]" />}>
            <TerminalFeed live />
          </Suspense>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-medium text-bs-muted">Quick Command</h2>
          <Suspense fallback={<PanelSkeleton className="h-[600px]" />}>
            <ChatInterface />
          </Suspense>
        </div>
      </div>
    </>
  );
}
