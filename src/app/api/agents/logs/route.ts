import { NextResponse } from "next/server";
import { listAgentLogs, formatLogForTerminal } from "@/lib/db/logs";
import { getSetupWarnings } from "@/lib/supabase/server";

export const revalidate = 3;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || 50);
  const agentSlug = searchParams.get("agentSlug") || undefined;

  const { logs, source } = await listAgentLogs({ limit, agentSlug });

  return NextResponse.json({
    logs: logs.map(formatLogForTerminal),
    source,
    warnings: source === "mock" ? getSetupWarnings() : [],
  });
}
