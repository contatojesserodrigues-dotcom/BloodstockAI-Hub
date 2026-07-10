import { VirtualOffice3D } from "@/components/office3d/VirtualOffice3D";
import { getLiveAgents } from "@/lib/agent-service";
import { getDashboardMetrics } from "@/lib/db/agent-actions";
import { listAgentLogs } from "@/lib/db/logs";

export const revalidate = 10;

export default async function OfficePage() {
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
    avatarColor: "#2563EB",
  }));

  return (
    <VirtualOffice3D
      initialAgents={agents}
      initialMetrics={{
        activeAgents: metrics.activeAgents,
        pendingApprovals: metrics.pendingApprovals,
        totalLeads: metrics.totalLeads,
      }}
      initialLogs={initialLogs}
    />
  );
}
