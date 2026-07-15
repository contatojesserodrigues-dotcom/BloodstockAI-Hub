import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enrichCompanyLead, getTavilyConfig } from "@/lib/tavily/client";
import { insertSupabaseRows, getSupabaseConfig } from "@/lib/supabase/server";
import { logAgentActivity } from "@/lib/agent-service";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { companyName, website, country } = body as {
    companyName?: string;
    website?: string | null;
    country?: string | null;
  };

  if (!companyName) {
    return NextResponse.json({ error: "companyName is required" }, { status: 400 });
  }

  const tavily = getTavilyConfig();
  if (!tavily.configured) {
    return NextResponse.json({
      ok: false,
      warning: tavily.warning,
      lead: {
        companyName,
        website: website || null,
        country: country || null,
        publicEmail: null,
        publicPhone: null,
        linkedinUrl: null,
        sourceUrls: website ? [website] : [],
        confidenceScore: 0.5,
      },
    });
  }

  await logAgentActivity("emma-collins", `Enriching lead: ${companyName}`, "info", {
    status: "RESEARCHING",
    currentTask: `Enriching ${companyName}`,
  });

  const lead = await enrichCompanyLead({ companyName, website, country });

  const supabase = getSupabaseConfig();
  if (supabase.configured) {
    await insertSupabaseRows("agent_logs", [
      {
        id: randomUUID(),
        agent_slug: "emma-collins",
        agent_name: "Emma Collins",
        message: `Enriched ${companyName}`,
        level: "info",
        created_at: new Date().toISOString(),
      },
    ]);
  }

  await logAgentActivity("emma-collins", `Enrichment complete — ${companyName}`, "success", {
    status: "IDLE",
    lastAction: `Enriched ${companyName}`,
  });

  return NextResponse.json({ ok: true, lead });
}
