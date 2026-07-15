import { Header } from "@/components/layout/Header";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { getLiveAgent } from "@/lib/agent-service";
import { getDashboardMetrics } from "@/lib/db/agent-actions";
import { listApprovals } from "@/lib/db/approvals";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Target, AlertCircle, CheckCircle2 } from "lucide-react";

export default async function CEOPage() {
  const evelyn = await getLiveAgent("evelyn-stone");
  const [metrics, { approvals }] = await Promise.all([
    getDashboardMetrics(),
    listApprovals(5),
  ]);

  const pendingApprovals = metrics.pendingApprovals;

  const recommendations = [
    {
      icon: CheckCircle2,
      text: `Pipeline value ${formatCurrency(metrics.pipelineValue)} across ${metrics.totalLeads} leads.`,
      type: "positive",
    },
    {
      icon: TrendingUp,
      text: `${metrics.activeAgents} agents active across sales, research, CRM and executive workflows.`,
      type: "info",
    },
    {
      icon: Target,
      text: approvals[0]
        ? `Latest approval: ${approvals[0].subject || approvals[0].company} (${approvals[0].status})`
        : "4 outreach drafts awaiting approval in the queue.",
      type: "info",
    },
    {
      icon: AlertCircle,
      text: `${pendingApprovals} actions awaiting approval before external execution.`,
      type: "warning",
    },
  ];

  return (
    <>
      <Header title="CEO Dashboard" subtitle="Executive intelligence by Evelyn Stone" />

      <div className="mb-6 flex items-center gap-4 glass rounded-2xl p-5">
        {evelyn ? (
          <>
            <AgentAvatar name={evelyn.name} color={evelyn.avatarColor} size="lg" />
            <div>
              <p className="text-lg font-medium">{evelyn.name}</p>
              <p className="text-sm text-bs-muted">{evelyn.role}</p>
              <p className="mt-2 text-sm text-white/50">{evelyn.currentTask}</p>
            </div>
          </>
        ) : (
          <div>
            <p className="text-lg font-medium">Evelyn Stone</p>
            <p className="text-sm text-bs-muted">CEO Dashboard AI</p>
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Pipeline Value", value: formatCurrency(metrics.pipelineValue) },
          { label: "Total Leads", value: metrics.totalLeads },
          { label: "Pending Approvals", value: pendingApprovals },
          { label: "Active Agents", value: metrics.activeAgents },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <p className="text-[11px] uppercase tracking-wider text-bs-muted">{s.label}</p>
            <p className="mt-2 text-2xl font-light">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3">
        {recommendations.map((r, i) => (
          <div key={i} className="glass flex items-start gap-3 rounded-xl p-4">
            <r.icon className="mt-0.5 h-5 w-5 shrink-0 text-bs-accent" />
            <p className="text-sm text-white/70">{r.text}</p>
          </div>
        ))}
      </div>
    </>
  );
}
