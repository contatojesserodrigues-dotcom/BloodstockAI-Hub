import { AGENTS } from "@/lib/agents";
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

export async function getDbAgentBySlug(slug: string) {
  return prisma.agent.findUnique({ where: { slug } });
}

export async function getLiveAgent(slug: string): Promise<LiveAgent | null> {
  const staticAgent = AGENTS.find((a) => a.slug === slug);
  if (!staticAgent) return null;

  const dbAgent = await getDbAgentBySlug(slug);

  return {
    slug: staticAgent.slug,
    name: staticAgent.name,
    role: staticAgent.role,
    title: staticAgent.title,
    room: staticAgent.room,
    bio: staticAgent.bio,
    tools: staticAgent.tools,
    avatarColor: staticAgent.avatarColor,
    dbId: dbAgent?.id || "",
    status: dbAgent?.status || staticAgent.status,
    currentTask: dbAgent?.currentTask || staticAgent.currentTask,
    lastAction: dbAgent?.lastAction || staticAgent.lastAction,
  };
}

export async function getLiveAgents(): Promise<LiveAgent[]> {
  const dbAgents = await prisma.agent.findMany();
  const dbBySlug = new Map(dbAgents.map((a) => [a.slug, a]));

  return AGENTS.map((staticAgent) => {
    const dbAgent = dbBySlug.get(staticAgent.slug);
    return {
      slug: staticAgent.slug,
      name: staticAgent.name,
      role: staticAgent.role,
      title: staticAgent.title,
      room: staticAgent.room,
      bio: staticAgent.bio,
      tools: staticAgent.tools,
      avatarColor: staticAgent.avatarColor,
      dbId: dbAgent?.id || "",
      status: dbAgent?.status || staticAgent.status,
      currentTask: dbAgent?.currentTask || staticAgent.currentTask,
      lastAction: dbAgent?.lastAction || staticAgent.lastAction,
    };
  });
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
  const agent = await getDbAgentBySlug(slug);
  if (!agent) return null;

  const log = await prisma.agentLog.create({
    data: { agentId: agent.id, message, level },
  });

  if (updates) {
    await prisma.agent.update({
      where: { id: agent.id },
      data: updates,
    });
  }

  return log;
}

export async function getOfficeRooms() {
  const agents = await getLiveAgents();
  const { ROOMS } = await import("@/lib/agents");
  return ROOMS.map((room) => ({
    room,
    agents: agents.filter((agent) => (room.agents as readonly string[]).includes(agent.slug)),
  }));
}
