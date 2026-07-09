import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AgentActionButton } from "@/components/agents/AgentActionButton";
import { PanelSkeleton } from "@/components/ui/loading-skeletons";
import { AGENTS, ROOMS } from "@/lib/agents";
import { AGENT_ACTIONS } from "@/lib/agent-actions";
import { getLiveAgent } from "@/lib/agent-service";
import { ChatInterface } from "@/lib/dynamic-components";
import { listAgentLogs } from "@/lib/db/logs";
import { ArrowLeft, ScrollText } from "lucide-react";

export function generateStaticParams() {
  return AGENTS.map((agent) => ({ id: agent.slug }));
}

export const revalidate = 10;

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getLiveAgent(id);
  if (!agent) notFound();

  const action = AGENT_ACTIONS[id];
  const room = ROOMS.find((r) => r.id === agent.room);
  const { logs: agentLogs } = await listAgentLogs({ agentSlug: id, limit: 10 });
  const logs = agentLogs.map((log) => ({ id: log.id, message: log.message }));

  return (
    <>
      <Link href="/agents" className="mb-4 inline-flex items-center gap-1 text-sm text-bs-muted hover:text-bs-text">
        <ArrowLeft className="h-4 w-4" />All Agents
      </Link>
      <Header title={agent.name} subtitle={agent.role} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <AgentAvatar name={agent.name} color={agent.avatarColor} size="lg" />
              <div>
                <p className="text-lg font-medium">{agent.title}</p>
                <StatusBadge status={agent.status} />
                <p className="mt-2 text-xs text-bs-muted">{room?.name}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/50">{agent.bio}</p>
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wider text-bs-muted">Current Task</p>
              <p className="mt-1 text-sm">{agent.currentTask}</p>
            </div>
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-wider text-bs-muted">Last Action</p>
              <p className="mt-1 text-sm text-white/50">{agent.lastAction}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {agent.tools.map((t) => (
                <span key={t} className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/40">{t}</span>
              ))}
            </div>
            {action && (
              <div className="mt-5 border-t border-bs-border pt-4">
                <p className="mb-2 text-[11px] uppercase tracking-wider text-bs-muted">Agent Action</p>
                <p className="mb-3 text-xs text-white/40">{action.description}</p>
                <AgentActionButton slug={id} label={action.label} className="bs-btn-primary text-xs" />
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="mb-3 flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-bs-accent" />
              <p className="text-sm font-medium">Activity Timeline</p>
            </div>
            <div className="space-y-3">
              {logs.length > 0 ? logs.map((log) => (
                <div key={log.id} className="border-l-2 border-bs-accent/30 pl-3">
                  <p className="text-[13px] text-white/70">{log.message}</p>
                </div>
              )) : (
                <p className="text-sm text-bs-muted">{agent.lastAction}</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Suspense fallback={<PanelSkeleton className="h-[600px]" />}>
            <ChatInterface agentSlug={agent.slug} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
