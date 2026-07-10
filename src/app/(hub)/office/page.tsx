import { getLiveAgents } from "@/lib/agent-service";
import { VirtualOfficeExperience } from "@/components/virtual-office/VirtualOfficeExperience";

export const revalidate = 10;

export default async function OfficePage() {
  const agents = await getLiveAgents();

  const liveAgents = agents.map((a) => ({
    slug: a.slug,
    name: a.name,
    role: a.role,
    department: a.room || a.role,
    room: a.room,
    status: String(a.status).toUpperCase().replace(/-/g, "_"),
    currentTask: a.currentTask,
    lastAction: a.lastAction,
    tools: [...a.tools],
    avatarColor: a.avatarColor,
  }));

  return <VirtualOfficeExperience initialAgents={liveAgents} />;
}
