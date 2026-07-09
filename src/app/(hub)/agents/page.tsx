import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getLiveAgents } from "@/lib/agent-service";
import { ROOMS } from "@/lib/agents";

export const revalidate = 10;

export default async function AgentsPage() {
  const agents = await getLiveAgents();

  return (
    <>
      <Header title="AI Agents" subtitle="All BloodstockAI virtual agents" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const room = ROOMS.find((r) => r.id === agent.room);
          return (
            <Link key={agent.slug} href={`/agents/${agent.slug}`} className="glass glass-hover rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <AgentAvatar name={agent.name} color={agent.avatarColor} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-[11px] text-bs-muted">{agent.title}</p>
                  <p className="mt-1 text-xs text-white/40">{agent.role}</p>
                  <div className="mt-3"><StatusBadge status={agent.status} /></div>
                  <p className="mt-2 text-[11px] text-white/30">{room?.name}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
