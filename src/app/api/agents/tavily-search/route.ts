import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runTavilyLeadSearchPipeline } from "@/lib/agents/tavilyLeadResearch";
import { findLeadCompanies, getTavilyConfig } from "@/lib/tavily/client";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    country = "UK and Ireland",
    segment = "bloodstock",
    auctionFocus = "Tattersalls and Goffs",
    limit = 10,
    fullPipeline = true,
  } = body as {
    country?: string;
    segment?: string;
    auctionFocus?: string;
    limit?: number;
    fullPipeline?: boolean;
  };

  if (fullPipeline) {
    const result = await runTavilyLeadSearchPipeline({ country, segment, auctionFocus, limit });
    return NextResponse.json(result);
  }

  const tavily = getTavilyConfig();
  if (!tavily.configured) {
    return NextResponse.json({
      ok: false,
      mode: "mock",
      warning: tavily.warning,
      companies: [],
    });
  }

  const companies = await findLeadCompanies({ country, segment, auctionFocus, limit });
  return NextResponse.json({ ok: true, mode: "live", companies });
}
