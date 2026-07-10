import { getActivityMeta } from "@/lib/office/activities";
import { zoneForAgent } from "@/lib/office/zones";

export interface OfficeAgentSnapshot {
  slug: string;
  name: string;
  room: string;
  status: string;
  currentTask: string;
}

const ZONE_LABELS: Record<string, string> = {
  sales: "Sales Office",
  research: "Lead Research Room",
  crm: "CRM Room",
  email: "Email Marketing Room",
  copy: "Copy Intelligence Room",
  success: "Customer Success Room",
  partnerships: "Partnerships Room",
  market: "Market Intelligence Room",
  social: "Social Media Room",
  product: "Product Room",
  boardroom: "Executive Boardroom",
  ceo: "CEO Suite",
  revenue: "Revenue Office",
  meeting: "Meeting Room",
  lounge: "Lounge",
  corridor: "Main Corridor",
};

export function zoneLabel(zoneKey: string) {
  return ZONE_LABELS[zoneKey] || zoneKey;
}

export function formatOfficeTerminalMessage(agent: OfficeAgentSnapshot, prev?: OfficeAgentSnapshot) {
  const zone = zoneForAgent(agent.room, agent.status);
  const location = zoneLabel(zone);
  const activity = getActivityMeta(agent.status, agent.currentTask);

  if (!prev) {
    return `[Virtual Office] ${agent.name} entered ${location} — ${activity.bubble}`;
  }

  const prevZone = zoneForAgent(prev.room, prev.status);
  const moved = prevZone !== zone;
  const taskChanged = prev.currentTask !== agent.currentTask;
  const statusChanged = prev.status !== agent.status;

  if (moved && (statusChanged || taskChanged)) {
    return `[Virtual Office] ${agent.name} walked to ${location} — ${activity.bubble}`;
  }
  if (moved) {
    return `[Virtual Office] ${agent.name} moved to ${location}`;
  }
  if (taskChanged || statusChanged) {
    return `[Virtual Office] ${agent.name} @ ${location} — ${activity.bubble}`;
  }

  return null;
}

export function buildOfficeFeed(
  agents: OfficeAgentSnapshot[],
  previous: Map<string, OfficeAgentSnapshot>
) {
  const now = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const entries: { id: string; time: string; agent: string; message: string; kind: "office" }[] = [];

  for (const agent of agents) {
    const prev = previous.get(agent.slug);
    const message = formatOfficeTerminalMessage(agent, prev);
    if (message) {
      entries.push({
        id: `office-${agent.slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        time: now,
        agent: agent.name,
        message,
        kind: "office",
      });
    }
    previous.set(agent.slug, agent);
  }

  return entries;
}
