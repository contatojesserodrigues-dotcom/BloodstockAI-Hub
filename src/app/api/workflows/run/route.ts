import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseGraph, type WorkflowGraph } from "@/lib/workflows/native";
import { sendCommandToN8n } from "@/lib/tools/n8n";

async function runNative(graph: WorkflowGraph): Promise<string> {
  const lines: string[] = ["Kuiper native engine"];
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const incoming = new Set(graph.edges.map((e) => e.target));
  const starts = graph.nodes.filter((n) => !incoming.has(n.id));
  const queue = [...starts];
  const seen = new Set<string>();

  while (queue.length) {
    const node = queue.shift()!;
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    lines.push(`→ [${node.type}] ${node.label} (${node.kind})`);
    if (node.type === "action" && node.kind === "send_email") {
      lines.push("  · queued email draft for human approval");
    }
    if (node.type === "agent" || node.kind === "run_agent") {
      lines.push(`  · agent step ready${node.config?.agentHint ? ` (${node.config.agentHint})` : ""}`);
    }
    for (const edge of graph.edges.filter((e) => e.source === node.id)) {
      const next = byId.get(edge.target);
      if (next) queue.push(next);
    }
  }

  lines.push("Done.");
  return lines.join("\n");
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const engine = body.engine === "n8n" ? "n8n" : "native";
  const graph: WorkflowGraph =
    typeof body.graph === "string" ? parseGraph(body.graph) : parseGraph(JSON.stringify(body.graph || {}));

  let log = "";
  let status = "completed";

  try {
    if (engine === "n8n") {
      const result = await sendCommandToN8n(
        `Execute Kuiper workflow: ${body.name || "unnamed"} — ${graph.nodes.map((n) => n.label).join(" → ")}`,
        "kuiper-workflow",
        "Kuiper Workflow Engine"
      );
      log = result?.ok
        ? `Forwarded to n8n.\n${JSON.stringify(result.data ?? {}, null, 2)}`
        : `n8n optional integration not configured or failed. Set N8N_AGENT_WEBHOOK_URL, or switch engine to native.\n${result?.error || result?.warning || ""}`;
      if (!result?.ok) status = "error";
    } else {
      log = await runNative(graph);
    }
  } catch (e) {
    status = "error";
    log = e instanceof Error ? e.message : "Execution failed";
  }

  if (body.id) {
    try {
      await prisma.workflowExecution.create({
        data: {
          workflowId: String(body.id),
          status,
          result: log,
        },
      });
    } catch {
      // workflow may not be saved yet
    }
  }

  return NextResponse.json({ ok: status !== "error", log, status });
}
