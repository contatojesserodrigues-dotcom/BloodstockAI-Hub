import { NextResponse } from "next/server";
import { verifyWebhookSecret } from "@/lib/webhook-auth";
import { getDbAgentBySlug } from "@/lib/agent-service";
import { prisma } from "@/lib/prisma";
import type { PipelineStage } from "@prisma/client";

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const leads = Array.isArray(body.leads) ? body.leads : [body];

  const results = [];
  for (const lead of leads) {
    const {
      name,
      email,
      company,
      country,
      segment,
      stage = "NEW_LEAD",
      value = 0,
      source,
      notes,
      agentSlug,
    } = lead as {
      name: string;
      email?: string;
      company?: string;
      country?: string;
      segment?: string;
      stage?: PipelineStage;
      value?: number;
      source?: string;
      notes?: string;
      agentSlug?: string;
    };

    if (!name) continue;

    const existing = email
      ? await prisma.lead.findFirst({ where: { email } })
      : await prisma.lead.findFirst({ where: { name, company: company || undefined } });

    const record = existing
      ? await prisma.lead.update({
          where: { id: existing.id },
          data: { country, segment, stage, value, source, notes, company },
        })
      : await prisma.lead.create({
          data: { name, email, company, country, segment, stage, value, source, notes },
        });

    results.push(record);

    if (agentSlug) {
      const agent = await getDbAgentBySlug(agentSlug);
      if (agent) {
        await prisma.agentLog.create({
          data: {
            agentId: agent.id,
            message: `Lead ${existing ? "updated" : "created"}: ${name}${company ? ` (${company})` : ""}`,
            level: "success",
          },
        });
      }
    }
  }

  return NextResponse.json({ ok: true, count: results.length, leads: results });
}
