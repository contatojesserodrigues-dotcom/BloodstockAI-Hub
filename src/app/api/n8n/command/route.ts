import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendCommandToN8nServer } from "@/lib/n8n-command";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { command, agentSlug } = await request.json();
  if (!command?.trim()) {
    return NextResponse.json({ error: "command required" }, { status: 400 });
  }

  const result = await sendCommandToN8nServer(command.trim(), agentSlug);
  return NextResponse.json(result);
}
