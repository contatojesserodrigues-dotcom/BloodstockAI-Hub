import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INTEGRATIONS } from "@/lib/integrations-data";

export async function GET() {
  let byProvider = new Map<string, { provider: string; connected: boolean }>();
  try {
    const connections = await prisma.toolConnection.findMany();
    byProvider = new Map(connections.map((c) => [c.provider, c]));
  } catch {
    // Supabase-only production — env vars drive connection status
  }

  const envChecks: Record<string, boolean> = {
    claude: !!process.env.ANTHROPIC_API_KEY,
    tavily: !!process.env.TAVILY_API_KEY,
    supabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hubspot: !!process.env.HUBSPOT_ACCESS_TOKEN || !!process.env.HUBSPOT_API_KEY,
    gmail: !!process.env.GMAIL_CLIENT_ID,
    calendar: !!process.env.GOOGLE_CALENDAR_CLIENT_ID,
    n8n: !!process.env.N8N_BASE_URL || !!process.env.N8N_AGENT_WEBHOOK_URL,
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
