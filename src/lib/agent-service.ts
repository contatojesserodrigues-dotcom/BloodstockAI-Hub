import { listAgents } from "@/lib/db/agent-actions";
import { prisma } from "@/lib/prisma";
import type { AgentStatus } from "@prisma/client";

export interface LiveAgent {
  slug: string;
  name: string;
  role: string;
  title: string;
  room: string;
  bio: string;
  tools: readonly string[];
  status: AgentStatus | string;
  currentTask: string;
  lastAction: string;
  avatarColor: string;
  dbId: string;
}

function normalizeStatus(status: string): AgentStatus | string {
  return status.toUpperCase().replace(/-/g, "_") as AgentStatus;
}

export async function getLiveAgents(): Promise<LiveAgent[]> {
  const { agents } = await listAgents();
  return agents.map((a) => ({
    slug: a.slug,
    name: a.name,
    role: a.role,
    title: a.role,
    room: a.room || a.department,
    bio: a.bio || "",
    tools: a.tools,
    avatarColor: a.avatar_color || "#8B1538",
    dbId: a.id,
    status: normalizeStatus(a.status),
    currentTask: a.current_task || "Standing by",
    lastAction: a.last_action || "Ready",
  }));
}

export async function getDbAgentBySlug(slug: string) {
  return prisma.agent.findUnique({ where: { slug } });
}

export async function getLiveAgent(slug: string): Promise<LiveAgent | null> {
  const agents = await getLiveAgents();
  return agents.find((a) => a.slug === slug) || null;
}

export async function updateAgentState(
  slug: string,
  data: {
    status?: AgentStatus;
    currentTask?: string;
    lastAction?: string;
  }
) {
  const agent = await getDbAgentBySlug(slug);
  if (!agent) return null;

  return prisma.agent.update({
    where: { id: agent.id },
    data,
  });
}

export async function logAgentActivity(
  slug: string,
  message: string,
  level = "info",
  updates?: { status?: AgentStatus; currentTask?: string; lastAction?: string }
) {
  const { writeAgentLog } = await import("@/lib/db/logs");
  const { updateAgentStatus } = await import("@/lib/db/agent-actions");
  const agents = await getLiveAgents();
  const agent = agents.find((a) => a.slug === slug);

  await writeAgentLog({
    agentSlug: slug,
    agentName: agent?.name || slug,
    message,
    level,
  });

  if (updates) {
    await updateAgentStatus(slug, {
      status: updates.status?.toLowerCase().replace(/_/g, "_") as never,
      current_task: updates.currentTask,
      last_action: updates.lastAction,
    });
  }

  const prismaAgent = await getDbAgentBySlug(slug);
  if (prismaAgent) {
    if (updates) {
      await prisma.agent.update({ where: { id: prismaAgent.id }, data: updates });
    }
    return prisma.agentLog.create({
      data: { agentId: prismaAgent.id, message, level },
    });
  }
  return null;
}

export async function getOfficeRooms() {
  const agents = await getLiveAgents();
  const { ROOMS } = await import("@/lib/agents");
  return ROOMS.map((room) => ({
    room,
    agents: agents.filter((agent) => (room.agents as readonly string[]).includes(agent.slug)),
  }));
}
