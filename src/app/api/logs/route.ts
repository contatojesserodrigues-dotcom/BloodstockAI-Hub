import { NextResponse } from "next/server";
import { listAgentLogs, formatLogForTerminal } from "@/lib/db/logs";

export const revalidate = 3;

/** Legacy path — forwards to Supabase-backed logs */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || 50);
  const agentSlug = searchParams.get("agentSlug") || undefined;
  const { logs } = await listAgentLogs({ limit, agentSlug });
  return NextResponse.json(logs.map(formatLogForTerminal));
}
