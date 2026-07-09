import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncLeadToHubSpot } from "@/lib/hubspot/client";
import { logAgentActivity } from "@/lib/agent-service";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    companyName,
    website,
    country,
    contactName,
    email,
    phone,
    segment,
    description,
    sourceUrls,
    expectedValue,
  } = body as {
    companyName?: string;
    website?: string | null;
    country?: string | null;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    segment?: string | null;
    description?: string | null;
    sourceUrls?: string[];
    expectedValue?: number;
  };

  if (!companyName) {
    return NextResponse.json({ error: "companyName is required" }, { status: 400 });
  }

  await logAgentActivity("oliver-brooks", `HubSpot sync started for ${companyName}`, "info", {
    status: "UPDATING_CRM",
    currentTask: `HubSpot: ${companyName}`,
  });

  const result = await syncLeadToHubSpot({
    companyName,
    website,
    country,
    contactName,
    email,
    phone,
    segment,
    description,
    sourceUrls,
    expectedValue,
  });

  if (result.skipped) {
    await logAgentActivity("oliver-brooks", `HubSpot sync skipped — ${result.warning}`, "warn", {
      status: "IDLE",
    });
    return NextResponse.json({ ok: false, skipped: true, warning: result.warning });
  }

  if (!result.ok) {
    await logAgentActivity("oliver-brooks", `HubSpot sync failed for ${companyName}`, "error", {
      status: "ERROR",
    });
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  await logAgentActivity("oliver-brooks", `HubSpot synced ${companyName}`, "success", {
    status: "IDLE",
    lastAction: `Synced ${companyName} to HubSpot`,
  });

  return NextResponse.json({
    ok: true,
    companyId: result.companyId,
    contactId: result.contactId,
    dealId: result.dealId,
  });
}
