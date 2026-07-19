import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { mergeWithOfficialAgents, AGENT_CONFIG } from "@/lib/agents/agent-config";
import { prisma } from "@/lib/prisma";
import { MOCK_DASHBOARD_METRICS } from "@/lib/mock-data";
import type { AgentRecord, AgentStatus } from "@/lib/supabase/types";

function mapPrismaStatus(status: string): AgentStatus {
  return status.toLowerCase().replace(/-/g, "_") as AgentStatus;
}

function mapPrismaAgents(dbAgents: Awaited<ReturnType<typeof prisma.agent.findMany>>): AgentRecord[] {
  return dbAgents.map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    role: a.role,
    department: a.room,
    room: a.room,
    bio: a.bio,
    status: mapPrismaStatus(a.status),
    current_task: a.currentTask,
    last_action: a.lastAction,
    tools: JSON.parse(a.tools || "[]"),
    avatar_color: a.avatarColor,
  }));
}

/** Always returns the official 14-agent BloodstockAI administrative team (merged with live state). */
export async function listAgents(): Promise<{ agents: AgentRecord[]; source: "supabase" | "mock" }> {
  let liveAgents: AgentRecord[] = [];
  let source: "supabase" | "mock" = "mock";

  if (isSupabaseConfigured()) {
    try {
      const admin = createSupabaseAdmin();
      if (admin) {
        const { data, error } = await admin.from("agents").select("*").order("name");
        if (!error && Array.isArray(data) && data.length) {
          liveAgents = (data as Record<string, unknown>[]).map((a) => ({
            id: String(a.id),
            slug: String(a.slug),
            name: String(a.name),
            role: String(a.role),
            department: String(a.department || a.room || ""),
            room: String(a.room || ""),
            bio: a.bio ? String(a.bio) : null,
            status: mapPrismaStatus(String(a.status || "idle")),
            current_task: a.current_task ? String(a.current_task) : null,
            last_action: a.last_action ? String(a.last_action) : null,
            tools: Array.isArray(a.tools) ? (a.tools as string[]) : [],
            avatar_color: a.avatar_color ? String(a.avatar_color) : null,
            created_at: a.created_at ? String(a.created_at) : undefined,
            updated_at: a.updated_at ? String(a.updated_at) : undefined,
          }));
          source = "supabase";
        }
      }
    } catch {
      // fall through
    }
  }

  if (!liveAgents.length) {
    try {
      const dbAgents = await prisma.agent.findMany({ orderBy: { name: "asc" } });
      if (dbAgents.length) {
        liveAgents = mapPrismaAgents(dbAgents);
        source = "mock";
      }
    } catch {
      // fall through
    }
  }

  return { source, agents: mergeWithOfficialAgents(liveAgents) };
}

export async function getAgentBySlug(slug: string): Promise<AgentRecord | null> {
  const { agents } = await listAgents();
  return agents.find((a) => a.slug === slug) || null;
}

export async function updateAgentStatus(
  slug: string,
  patch: { status?: AgentStatus; current_task?: string; last_action?: string }
) {
  try {
    const admin = createSupabaseAdmin();
    if (admin) {
      await admin
        .from("agents")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("slug", slug);
    }
  } catch {
    // continue with prisma fallback
  }

  try {
    const prismaAgent = await prisma.agent.findUnique({ where: { slug } });
    if (prismaAgent) {
      await prisma.agent.update({
        where: { id: prismaAgent.id },
        data: {
          status: patch.status?.toUpperCase().replace(/-/g, "_") as never,
          currentTask: patch.current_task,
          lastAction: patch.last_action,
        },
      });
    }
  } catch {
    // mock mode — no-op
  }
}

export async function createAgentTask(input: {
  agentSlug: string;
  title: string;
  description?: string;
  command?: string;
}) {
  const agent = await getAgentBySlug(input.agentSlug);

  try {
    const admin = createSupabaseAdmin();
    if (admin) {
      const { data } = await admin
        .from("agent_tasks")
        .insert({
          agent_id: agent?.id?.startsWith("official-") ? null : agent?.id || null,
          agent_slug: input.agentSlug,
          title: input.title,
          description: input.description,
          command: input.command,
          status: "in_progress",
        })
        .select()
        .single();
      if (data) return data;
    }
  } catch {
    // fall through
  }

  try {
    const prismaAgent = await prisma.agent.findUnique({ where: { slug: input.agentSlug } });
    if (prismaAgent) {
      return prisma.agentTask.create({
        data: {
          agentId: prismaAgent.id,
          title: input.title,
          description: input.description,
          status: "in_progress",
        },
      });
    }
  } catch {
    // mock mode
  }
  return null;
}

export async function completeAgentTask(taskId: string, result?: Record<string, unknown>) {
  try {
    const admin = createSupabaseAdmin();
    if (admin && isSupabaseConfigured()) {
      await admin
        .from("agent_tasks")
        .update({ status: "completed", result, completed_at: new Date().toISOString() })
        .eq("id", taskId);
    }
  } catch {
    // mock mode
  }
}

export async function getDashboardMetrics() {
  if (isSupabaseConfigured()) {
    try {
      const admin = createSupabaseAdmin();
      if (admin) {
        const [agentsRes, approvalsRes, leadsRes, pipelineRes] = await Promise.all([
          admin.from("agents").select("status"),
          admin.from("approval_cards").select("id", { count: "exact", head: true }).eq("status", "pending"),
          admin.from("leads").select("id", { count: "exact", head: true }),
          admin.from("sales_pipeline").select("value"),
        ]);

        const hasData =
          (Array.isArray(agentsRes.data) && agentsRes.data.length > 0) ||
          (approvalsRes.count || 0) > 0 ||
          (leadsRes.count || 0) > 0 ||
          (Array.isArray(pipelineRes.data) && pipelineRes.data.length > 0);

        if (hasData) {
          const activeAgents =
            (agentsRes.data as { status?: string }[] | null)?.filter((a) => a.status && a.status !== "idle").length ||
            AGENT_CONFIG.filter((a) => a.status !== "idle").length;
          const pipelineValue =
            (pipelineRes.data as { value?: number }[] | null)?.reduce((sum, d) => sum + Number(d.value || 0), 0) || 0;

          return {
            source: "supabase" as const,
            activeAgents,
            pendingApprovals: approvalsRes.count || 0,
            totalLeads: leadsRes.count || 0,
            pipelineValue,
          };
        }
      }
    } catch {
      // fall through
    }
  }

  try {
    const [pendingApprovals, totalLeads, deals, agents] = await Promise.all([
      prisma.approvalRequest.count({ where: { status: "PENDING" } }),
      prisma.lead.count(),
      prisma.cRMDeal.aggregate({ _sum: { value: true } }),
      prisma.agent.findMany({ select: { status: true } }),
    ]);

    const hasData = pendingApprovals > 0 || totalLeads > 0 || (deals._sum.value || 0) > 0;
    if (hasData) {
      return {
        source: "mock" as const,
        activeAgents: agents.filter((a) => a.status !== "IDLE").length,
        pendingApprovals,
        totalLeads,
        pipelineValue: deals._sum.value || 0,
      };
    }
  } catch {
    // fall through
  }

  return {
    source: "mock" as const,
    activeAgents: AGENT_CONFIG.filter((a) => a.status !== "idle").length,
    pendingApprovals: MOCK_DASHBOARD_METRICS.pendingApprovals,
    totalLeads: MOCK_DASHBOARD_METRICS.totalLeads,
    pipelineValue: MOCK_DASHBOARD_METRICS.pipelineValue,
  };
}
