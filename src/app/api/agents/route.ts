import { NextResponse } from "next/server";
import { getLiveAgents } from "@/lib/agent-service";

export const revalidate = 10;

export async function GET() {
  const agents = await getLiveAgents();
  return NextResponse.json(
    agents.map((a) => ({
      slug: a.slug,
      name: a.name,
      role: a.role,
      title: a.title,
      room: a.room,
      bio: a.bio,
      tools: a.tools,
      status: a.status,
      currentTask: a.currentTask,
      lastAction: a.lastAction,
      avatarColor: a.avatarColor,
    }))
  );
}
