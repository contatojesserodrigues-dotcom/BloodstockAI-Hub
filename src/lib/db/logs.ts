import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { getMockTerminalLogs } from "@/lib/mock-data";
import type { AgentLogRecord } from "@/lib/supabase/types";

export async function listAgentLogs(options?: {
  limit?: number;
  agentSlug?: string;
}): Promise<{ logs: AgentLogRecord[]; source: "supabase" | "mock" }> {
  const limit = Math.min(options?.limit || 50, 100);

  try {
    const admin = createSupabaseAdmin();
    if (admin) {
      let query = admin
        .from("agent_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (options?.agentSlug) query = query.eq("agent_slug", options.agentSlug);

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length) {
        return { source: "supabase", logs: data as unknown as AgentLogRecord[] };
      }
    }
  } catch {
    // fall through
  }

  try {
    const rows = await prisma.agentLog.findMany({
      where: options?.agentSlug ? { agent: { slug: options.agentSlug } } : undefined,
      include: { agent: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    if (rows.length) {
      return {
        source: "mock",
        logs: rows.map((log) => ({
          id: log.id,
          agent_slug: log.agent.slug,
          agent_name: log.agent.name,
          message: log.message,
          level: log.level,
          created_at: log.createdAt.toISOString(),
        })),
      };
    }
  } catch {
    // fall through
  }

  const mockLogs = getMockTerminalLogs();
  const filtered = options?.agentSlug
    ? mockLogs.filter((l) => l.agent_slug === options.agentSlug)
    : mockLogs;

  return { source: "mock", logs: filtered.slice(0, limit) };
}

export async function writeAgentLog(input: {
  agentSlug: string;
  agentName: string;
  message: string;
  level?: string;
}) {
  const row = {
    agent_slug: input.agentSlug,
    agent_name: input.agentName,
    message: input.message,
    level: input.level || "info",
  };

  try {
    const admin = createSupabaseAdmin();
    if (admin) {
      const agent = await admin.from("agents").select("id").eq("slug", input.agentSlug).single();
      await admin.from("agent_logs").insert({ ...row, agent_id: agent.data?.id || null });
    }
  } catch {
    // continue
  }

  try {
    const prismaAgent = await prisma.agent.findUnique({ where: { slug: input.agentSlug } });
    if (prismaAgent) {
      await prisma.agentLog.create({
        data: { agentId: prismaAgent.id, message: input.message, level: input.level || "info" },
      });
    }
  } catch {
    // mock mode
  }
}

export function formatLogForTerminal(log: AgentLogRecord) {
  return {
    id: log.id,
    time: new Date(log.created_at).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    agent: log.agent_name,
    agentSlug: log.agent_slug,
    message: log.message,
    level: log.level,
    createdAt: log.created_at,
  };
}
