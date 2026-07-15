import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { processAgentCommand } from "@/lib/agents/agent-orchestrator";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const command = (body as { command?: string }).command?.trim();
  if (!command) return NextResponse.json({ error: "command is required" }, { status: 400 });

  const result = await processAgentCommand(command);
  return NextResponse.json(result);
}
