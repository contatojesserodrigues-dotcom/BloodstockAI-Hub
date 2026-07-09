import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INTEGRATIONS } from "@/lib/integrations-data";

export async function GET() {
  const connections = await prisma.toolConnection.findMany();
  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  const envChecks: Record<string, boolean> = {
    claude: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    perplexity: !!process.env.PERPLEXITY_API_KEY,
    hubspot: !!process.env.HUBSPOT_ACCESS_TOKEN || !!process.env.HUBSPOT_API_KEY,
    apollo: !!process.env.APOLLO_API_KEY,
    clay: !!process.env.CLAY_API_KEY,
    gmail: !!process.env.GMAIL_CLIENT_ID,
    calendar: !!process.env.GOOGLE_CALENDAR_CLIENT_ID,
    drive: !!process.env.GOOGLE_DRIVE_CLIENT_ID,
    figma: !!process.env.FIGMA_API_KEY,
    github: !!process.env.GITHUB_API_KEY,
    n8n: !!process.env.N8N_BASE_URL,
    bloodstock: !!process.env.BLOODSTOCKAI_API_KEY,
  };

  return NextResponse.json(
    INTEGRATIONS.map((i) => ({
      ...i,
      connected: envChecks[i.id] || byProvider.get(i.id)?.connected || false,
      configuredInEnv: envChecks[i.id] || false,
    }))
  );
}
