import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enrichCompanyLead, getTavilyConfig } from "@/lib/tools/tavily";
import { saveLeadBundle } from "@/lib/db/conversations";
import { writeAgentLog } from "@/lib/db/logs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { companyName, website, country, save = true } = body as {
    companyName?: string;
    website?: string | null;
    country?: string | null;
    save?: boolean;
  };

  if (!companyName) return NextResponse.json({ error: "companyName required" }, { status: 400 });

  const tavily = getTavilyConfig();
  if (!tavily.configured) {
    return NextResponse.json({ ok: false, mode: "mock", warning: tavily.warning });
  }

  await writeAgentLog({
    agentSlug: "emma-collins",
    agentName: "Emma Collins",
    message: `Enriching ${companyName}`,
  });

  const lead = await enrichCompanyLead({ companyName, website, country });

  if (save) {
    await saveLeadBundle({
      companyName: lead.companyName,
      website: lead.website,
      country: lead.country,
      segment: lead.segment,
      email: lead.publicEmail,
      phone: lead.publicPhone,
      description: lead.description,
      sourceUrls: lead.sourceUrls,
      confidenceScore: lead.confidenceScore,
      auctionRelevance: lead.auctionRelevance,
    });
  }

  return NextResponse.json({ ok: true, lead });
}
