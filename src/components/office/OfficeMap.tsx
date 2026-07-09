import Link from "next/link";
import { MessageSquare, ScrollText, CheckCircle } from "lucide-react";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AgentActionButton } from "@/components/agents/AgentActionButton";
import { getOfficeRooms } from "@/lib/agent-service";
import { AGENT_ACTIONS } from "@/lib/agent-actions";

export async function OfficeMap() {
  const officeRooms = await getOfficeRooms();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {officeRooms.map(({ room, agents }, i) => (
        <div
          key={room.id}
          className="glass glass-hover animate-room-enter rounded-2xl p-5"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">{room.name}</h3>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-bs-muted">
              {agents.length} agent{agents.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3">
            {agents.map((agent) => {
              const action = AGENT_ACTIONS[agent.slug];
              return (
                <div key={agent.slug} className="rounded-xl border border-bs-border bg-white/[0.02] p-3">
                  <div className="flex items-start gap-3">
                    <AgentAvatar name={agent.name} color={agent.avatarColor} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/agents/${agent.slug}`} className="truncate text-sm font-medium hover:text-bs-accent-light">
                          {agent.name}
                        </Link>
                        <StatusBadge status={agent.status} />
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-bs-muted">{agent.title}</p>
                      {agent.currentTask && (
                        <p className="mt-2 truncate text-[11px] text-white/40">{agent.currentTask}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {agent.tools.map((t) => (
                      <span key={t} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/40">{t}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Link href={`/agents/${agent.slug}?tab=chat`} className="bs-btn-ghost px-2 py-1 text-[10px]">
                      <MessageSquare className="mr-1 inline h-3 w-3" />Chat
                    </Link>
                    <AgentActionButton slug={agent.slug} label={action?.label || "Task"} />
                    <Link href={`/agents/${agent.slug}?tab=logs`} className="bs-btn-ghost px-2 py-1 text-[10px]">
                      <ScrollText className="mr-1 inline h-3 w-3" />Logs
                    </Link>
                    {agent.status === "WAITING_APPROVAL" && (
                      <Link href="/approvals" className="bs-btn-primary px-2 py-1 text-[10px]">
                        <CheckCircle className="mr-1 inline h-3 w-3" />Approve
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
