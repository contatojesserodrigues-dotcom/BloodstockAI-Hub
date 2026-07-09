import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncLeadToHubSpot } from "@/lib/tools/hubspot";
import { writeAgentLog } from "@/lib/db/logs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const result = await syncLeadToHubSpot(body);

  if (result.skipped) {
    return NextResponse.json({ ok: false, skipped: true, warning: result.warning });
  }

  await writeAgentLog({
    agentSlug: "oliver-brooks",
    agentName: "Oliver Brooks",
    message: `HubSpot sync: ${body.companyName || "lead"}`,
    level: result.ok ? "success" : "error",
  });

  return NextResponse.json(result);
}
