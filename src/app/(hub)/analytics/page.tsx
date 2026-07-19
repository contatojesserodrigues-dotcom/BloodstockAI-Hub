import { Header } from "@/components/layout/Header";
import { getDashboardMetrics } from "@/lib/db/agent-actions";
import { getLiveAgents } from "@/lib/agent-service";

export const revalidate = 30;

export default async function AnalyticsPage() {
  const [metrics, agents] = await Promise.all([getDashboardMetrics(), getLiveAgents()]);
  const active = agents.filter((a) => String(a.status).toLowerCase() !== "idle").length;

  const cards = [
    { label: "Agents online", value: active },
    { label: "Pending approvals", value: metrics.pendingApprovals },
    { label: "Leads tracked", value: metrics.totalLeads },
    { label: "Pipeline value", value: metrics.pipelineValue },
  ];

  return (
    <>
      <Header title="Analytics" subtitle="Workforce performance at a glance" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-5">
            <p className="text-[11px] uppercase tracking-wider text-bs-muted">{c.label}</p>
            <p className="mt-2 text-2xl font-light">{c.value}</p>
          </div>
        ))}
      </div>
    </>
  );
}
