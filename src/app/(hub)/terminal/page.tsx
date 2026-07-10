import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { TerminalFeed, VirtualOffice3D } from "@/lib/dynamic-components";
import { PanelSkeleton } from "@/components/ui/loading-skeletons";
import { getLiveAgents } from "@/lib/agent-service";
import { getDashboardMetrics } from "@/lib/db/agent-actions";
import { listAgentLogs } from "@/lib/db/logs";

export const revalidate = 10;

export default async function TerminalPage() {
  const [agents, metrics, { logs }] = await Promise.all([
    getLiveAgents(),
    getDashboardMetrics(),
    listAgentLogs({ limit: 10 }),
  ]);

  const initialLogs = logs.map((log, i) => ({
    id: log.id || `log-${i}`,
    agentName: log.agent_name || log.agent_slug || "Agent",
    message: log.message,
    time: log.created_at
      ? new Date(log.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : "just now",
    avatarColor: "#4A6FA5",
  }));

  return (
    <>
      <Header title="Live Terminal" subtitle="Virtual Office with live agents + activity feed" />

      <Suspense fallback={<PanelSkeleton className="h-[520px]" />}>
        <VirtualOffice3D
          embedded
          initialAgents={agents}
          initialMetrics={{
            activeAgents: metrics.activeAgents,
            pendingApprovals: metrics.pendingApprovals,
            totalLeads: metrics.totalLeads,
          }}
          initialLogs={initialLogs}
        />
      </Suspense>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-white/70">Activity Log</h2>
        <Suspense fallback={<PanelSkeleton className="h-[400px]" />}>
          <TerminalFeed live />
        </Suspense>
      </div>
    </>
  );
}
