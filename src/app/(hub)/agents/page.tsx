import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getLiveAgents } from "@/lib/agent-service";
import { AGENT_CONFIG } from "@/lib/agents/agent-config";
import { ROOMS } from "@/lib/agents";
import { AGENT_MONTHLY_USD } from "@/lib/pricing";

export const revalidate = 10;

const OFFICIAL_SLUGS = new Set(AGENT_CONFIG.map((a) => a.slug));

export default async function AgentsPage() {
  const agents = await getLiveAgents();
  const bloodstockAgents = agents.filter((a) => OFFICIAL_SLUGS.has(a.slug));
  const customAgents = agents.filter((a) => !OFFICIAL_SLUGS.has(a.slug));

  return (
    <>
      <Header
        title="My Agents"
        subtitle="BloodstockAI administrative team preserved — plus any custom Kuiper agents you add"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-bs-muted">
          Each agent: <span className="font-medium text-bs-accent">${AGENT_MONTHLY_USD}/mo</span>
          {" · "}
          <Link href="/billing" className="text-bs-accent underline-offset-2 hover:underline">
            View billing
          </Link>
        </p>
        <Link href="/agents/new" className="bs-btn-primary text-sm">
          Add custom agent
        </Link>
      </div>

      <section className="mb-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-bs-text">BloodstockAI Administrative Team</h2>
            <p className="mt-1 text-[12px] text-bs-muted">
              Original {bloodstockAgents.length} agents — roles, rooms, and workflows unchanged. Design shell only.
            </p>
          </div>
          <Link href="/office" className="bs-btn-ghost text-xs">
            Virtual Office
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bloodstockAgents.map((agent) => {
            const room = ROOMS.find((r) => r.id === agent.room);
            return (
              <Link key={agent.slug} href={`/agents/${agent.slug}`} className="glass glass-hover rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <AgentAvatar name={agent.name} color={agent.avatarColor} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{agent.name}</p>
                      <span className="shrink-0 rounded-full bg-bs-accent/10 px-2 py-0.5 text-[10px] text-bs-accent">
                        ${AGENT_MONTHLY_USD}/mo
                      </span>
                    </div>
                    <p className="text-[11px] text-bs-muted">{agent.title}</p>
                    <p className="mt-1 text-xs text-bs-muted/80">{agent.role}</p>
                    <div className="mt-3">
                      <StatusBadge status={agent.status} />
                    </div>
                    <p className="mt-2 text-[11px] text-bs-muted">{room?.name || agent.room}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {customAgents.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-medium text-bs-text">Custom Kuiper Agents</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customAgents.map((agent) => (
              <Link key={agent.slug} href={`/agents/${agent.slug}`} className="glass glass-hover rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <AgentAvatar name={agent.name} color={agent.avatarColor} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{agent.name}</p>
                      <span className="shrink-0 rounded-full bg-bs-accent/10 px-2 py-0.5 text-[10px] text-bs-accent">
                        ${AGENT_MONTHLY_USD}/mo
                      </span>
                    </div>
                    <p className="text-[11px] text-bs-muted">{agent.title}</p>
                    <div className="mt-3">
                      <StatusBadge status={agent.status} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
