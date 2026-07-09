import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findLeadCompanies, getTavilyConfig } from "@/lib/tools/tavily";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { query, country, segment, auctionFocus, limit = 10 } = body as {
    query?: string;
    country?: string;
    segment?: string;
    auctionFocus?: string;
    limit?: number;
  };

  const tavily = getTavilyConfig();
  if (!tavily.configured) {
    return NextResponse.json({
      ok: false,
      mode: "mock",
      warning: tavily.warning,
      companies: [],
    });
  }

  if (query) {
    const { tavilySearch } = await import("@/lib/tools/tavily");
    const result = await tavilySearch(query, { maxResults: limit });
    return NextResponse.json({ ok: true, mode: "live", result });
  }

  const companies = await findLeadCompanies({ country, segment, auctionFocus, limit });
  return NextResponse.json({ ok: true, mode: "live", companies });
}
