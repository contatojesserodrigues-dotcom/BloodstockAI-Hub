"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ACTION_KINDS,
  TRIGGER_KINDS,
  buildGraphFromBrief,
  emptyGraph,
  parseGraph,
  type WorkflowEdge,
  type WorkflowGraph,
  type WorkflowNode,
} from "@/lib/workflows/native";
import { Sparkles, Plus, Play, Save, Trash2 } from "lucide-react";

type SavedWorkflow = {
  id: string;
  name: string;
  engine: string;
  enabled: boolean;
  graph: string | null;
};

function nodeColor(type: WorkflowNode["type"]) {
  switch (type) {
    case "trigger":
      return "border-emerald-400 bg-emerald-50";
    case "agent":
      return "border-bs-accent bg-bs-accent/5";
    case "action":
      return "border-sky-400 bg-sky-50";
    default:
      return "border-bs-border bg-white";
  }
}

export function WorkflowStudio() {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState("Untitled workflow");
  const [engine, setEngine] = useState<"native" | "n8n">("native");
  const [graph, setGraph] = useState<WorkflowGraph>(emptyGraph());
  const [brief, setBrief] = useState("");
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runLog, setRunLog] = useState<string | null>(null);

  const selected = useMemo(
    () => graph.nodes.find((n) => n.id === selectedId) || null,
    [graph.nodes, selectedId]
  );

  const loadList = useCallback(async () => {
    const res = await fetch("/api/workflows");
    if (!res.ok) return;
    const data = (await res.json()) as { workflows: SavedWorkflow[] };
    setWorkflows(data.workflows || []);
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  function loadWorkflow(wf: SavedWorkflow) {
    setActiveId(wf.id);
    setName(wf.name);
    setEngine((wf.engine as "native" | "n8n") || "native");
    setGraph(parseGraph(wf.graph));
    setSelectedId(null);
    setAiNote(null);
    setRunLog(null);
  }

  function newBlank() {
    setActiveId(null);
    setName("Untitled workflow");
    setEngine("native");
    setGraph(emptyGraph());
    setSelectedId(null);
    setAiNote(null);
    setRunLog(null);
  }

  function addNode(type: WorkflowNode["type"], kind: string, label: string) {
    const id = `n-${Date.now().toString(36)}`;
    const last = graph.nodes[graph.nodes.length - 1];
    const node: WorkflowNode = {
      id,
      type,
      kind,
      label,
      x: (last?.x ?? 80) + 200,
      y: last?.y ?? 160,
    };
    const edges: WorkflowEdge[] = [...graph.edges];
    if (last) {
      edges.push({ id: `e-${last.id}-${id}`, source: last.id, target: id });
    }
    setGraph({ ...graph, nodes: [...graph.nodes, node], edges });
    setSelectedId(id);
  }

  function removeSelected() {
    if (!selectedId) return;
    setGraph({
      ...graph,
      nodes: graph.nodes.filter((n) => n.id !== selectedId),
      edges: graph.edges.filter((e) => e.source !== selectedId && e.target !== selectedId),
    });
    setSelectedId(null);
  }

  function applyAiBrief() {
    if (!brief.trim()) return;
    const result = buildGraphFromBrief(brief.trim());
    setGraph(result.graph);
    setName(result.name);
    setEngine("native");
    setAiNote(result.summary);
    setSelectedId(null);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/workflows", {
        method: activeId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeId,
          name,
          engine,
          graph,
          trigger: graph.nodes.find((n) => n.type === "trigger")?.kind,
          actions: JSON.stringify(graph.nodes.filter((n) => n.type !== "trigger").map((n) => n.kind)),
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.id) setActiveId(data.id);
      await loadList();
    } catch (e) {
      setRunLog(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function run() {
    setRunning(true);
    setRunLog(null);
    try {
      const res = await fetch("/api/workflows/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeId, graph, engine, name }),
      });
      const data = (await res.json()) as { log?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Run failed");
      setRunLog(data.log || "Workflow completed.");
      await loadList();
    } catch (e) {
      setRunLog(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr] xl:grid-cols-[240px_1fr_280px]">
      <aside className="glass order-2 rounded-2xl p-4 lg:order-1">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Workflows</p>
          <button type="button" onClick={newBlank} className="rounded-lg border border-bs-border p-1.5 hover:bg-bs-surface">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-1">
          {workflows.map((wf) => (
            <button
              key={wf.id}
              type="button"
              onClick={() => loadWorkflow(wf)}
              className={`w-full rounded-xl px-3 py-2 text-left text-[13px] transition ${
                activeId === wf.id ? "bg-bs-accent/10 text-bs-accent" : "text-bs-muted hover:bg-bs-surface"
              }`}
            >
              <p className="truncate font-medium text-bs-text">{wf.name}</p>
              <p className="text-[10px] uppercase tracking-wider">{wf.engine}</p>
            </button>
          ))}
          {workflows.length === 0 && (
            <p className="px-1 text-[12px] text-bs-muted">No saved workflows yet.</p>
          )}
        </div>
      </aside>

      <div className="order-1 space-y-4 lg:order-2">
        <div className="glass rounded-2xl p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <input
              className="bs-input w-full min-w-0 sm:max-w-xs"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
              className="bs-input w-full sm:max-w-[160px]"
              value={engine}
              onChange={(e) => setEngine(e.target.value as "native" | "n8n")}
            >
              <option value="native">Kuiper native</option>
              <option value="n8n">n8n (optional)</option>
            </select>
            <button type="button" className="bs-btn-primary gap-1.5" onClick={save} disabled={saving}>
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" className="bs-btn-ghost gap-1.5" onClick={run} disabled={running}>
              <Play className="h-3.5 w-3.5" />
              {running ? "Running..." : "Run"}
            </button>
          </div>
          {engine === "n8n" && (
            <p className="mt-3 text-[12px] text-bs-muted">
              n8n mode keeps your existing n8n cloud as the execution target. Prefer native for workflows built entirely inside Kuiper.{" "}
              <Link href="/settings/integrations" className="text-bs-accent hover:underline">
                Configure n8n
              </Link>
            </p>
          )}
        </div>

        <div className="glass relative min-h-[320px] overflow-auto rounded-2xl p-3 sm:min-h-[420px] sm:p-4">
          <div className="relative min-h-[300px] min-w-[640px] sm:min-h-[380px] sm:min-w-[900px]">
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {graph.edges.map((e) => {
                const s = graph.nodes.find((n) => n.id === e.source);
                const t = graph.nodes.find((n) => n.id === e.target);
                if (!s || !t) return null;
                return (
                  <line
                    key={e.id}
                    x1={s.x + 140}
                    y1={s.y + 36}
                    x2={t.x}
                    y2={t.y + 36}
                    stroke="#B794F4"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
            {graph.nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelectedId(node.id)}
                style={{ left: node.x, top: node.y }}
                className={`absolute w-[160px] rounded-xl border-2 px-3 py-3 text-left shadow-sm transition ${nodeColor(node.type)} ${
                  selectedId === node.id ? "ring-2 ring-bs-accent" : ""
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider text-bs-muted">{node.type}</p>
                <p className="mt-1 text-sm font-medium text-bs-text">{node.label}</p>
              </button>
            ))}
          </div>
        </div>

        {runLog && (
          <div className="rounded-xl border border-bs-border bg-bs-surface px-4 py-3 text-sm text-bs-muted whitespace-pre-wrap">
            {runLog}
          </div>
        )}
      </div>

      <aside className="order-3 space-y-4 xl:order-3">
        <div className="glass rounded-2xl p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-bs-accent" />
            AI workflow assistant
          </div>
          <p className="mb-3 text-[12px] text-bs-muted">
            Describe what you need. The assistant builds a native workflow you can edit.
          </p>
          <textarea
            className="bs-input min-h-28 text-sm"
            placeholder="e.g. When a new lead arrives, research with Tavily, update HubSpot, then draft an outreach email for approval"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
          <button type="button" className="bs-btn-primary mt-3 w-full" onClick={applyAiBrief}>
            Generate workflow
          </button>
          {aiNote && <p className="mt-3 text-[12px] text-bs-muted">{aiNote}</p>}
        </div>

        <div className="glass rounded-2xl p-4">
          <p className="mb-2 text-sm font-medium">Add node</p>
          <p className="mb-2 text-[11px] uppercase tracking-wider text-bs-muted">Triggers</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {TRIGGER_KINDS.map((t) => (
              <button
                key={t.kind}
                type="button"
                className="rounded-full border border-bs-border px-2.5 py-1 text-[11px] hover:border-bs-accent"
                onClick={() => addNode("trigger", t.kind, t.label)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="mb-2 text-[11px] uppercase tracking-wider text-bs-muted">Actions</p>
          <div className="flex flex-wrap gap-1.5">
            {ACTION_KINDS.map((t) => (
              <button
                key={t.kind}
                type="button"
                className="rounded-full border border-bs-border px-2.5 py-1 text-[11px] hover:border-bs-accent"
                onClick={() =>
                  addNode(t.kind === "run_agent" ? "agent" : "action", t.kind, t.label)
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="glass rounded-2xl p-4">
            <p className="text-sm font-medium">Selected node</p>
            <p className="mt-1 text-[12px] text-bs-muted">{selected.type} · {selected.kind}</p>
            <input
              className="bs-input mt-3"
              value={selected.label}
              onChange={(e) => {
                const label = e.target.value;
                setGraph({
                  ...graph,
                  nodes: graph.nodes.map((n) =>
                    n.id === selected.id ? { ...n, label } : n
                  ),
                });
              }}
            />
            <button
              type="button"
              className="bs-btn-ghost mt-3 w-full gap-1.5 text-red-600"
              onClick={removeSelected}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove node
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
