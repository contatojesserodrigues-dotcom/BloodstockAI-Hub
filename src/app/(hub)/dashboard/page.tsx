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
      <Header title="Command Center" subtitle="BloodstockAI Agent Virtual HUB - Real-time operations" />

      <div className="mb-6 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="glass glass-hover rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-bs-muted">{s.label}</p>
                <p className="mt-2 text-2xl font-light">{s.value}</p>
              </div>
              <s.icon className="h-5 w-5 text-bs-accent" />
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
            <h2 className="mb-4 text-sm font-medium text-white/70">Agent Status</h2>
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
          <h2 className="mb-4 text-sm font-medium text-white/70">Quick Command</h2>
          <Suspense fallback={<PanelSkeleton className="h-[600px]" />}>
            <ChatInterface />
          </Suspense>
        </div>
      </div>
    </>
  );
}
