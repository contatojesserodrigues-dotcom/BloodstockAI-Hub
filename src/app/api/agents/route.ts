import { NextResponse } from "next/server";
import { listAgents } from "@/lib/db/agent-actions";
import { getSetupWarnings } from "@/lib/supabase/server";

export const revalidate = 10;

export async function GET() {
  const { agents, source } = await listAgents();
  return NextResponse.json({
    agents: agents.map((a) => ({
      slug: a.slug,
      name: a.name,
      role: a.role,
      department: a.department,
      room: a.room,
      bio: a.bio,
      tools: a.tools,
      status: a.status,
      currentTask: a.current_task,
      lastAction: a.last_action,
      avatarColor: a.avatar_color,
    })),
    source,
    warnings: source === "mock" ? getSetupWarnings() : [],
  });
}
