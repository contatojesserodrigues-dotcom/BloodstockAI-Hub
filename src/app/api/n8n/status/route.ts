import { NextResponse } from "next/server";
import { checkN8nConnection, N8N_CONFIG } from "@/lib/n8n";

export const revalidate = 30;

export async function GET() {
  const status = await checkN8nConnection();
  return NextResponse.json(
    {
      ...status,
      webhooks: N8N_CONFIG.webhooks,
      dashboardUrl: N8N_CONFIG.dashboardUrl,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
