"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";

const TOOL_OPTIONS = [
  "Gmail",
  "Google Calendar",
  "Google Drive",
  "Outlook",
  "Teams",
  "HubSpot",
  "Salesforce",
  "Apollo.io",
  "Clay",
  "Perplexity",
  "Meta Business",
  "LinkedIn",
];

export function AgentBuilderForm({
  initialTemplate,
}: {
  initialTemplate?: {
    name: string;
    role: string;
    description: string | null;
    capabilities: string;
    integrations: string | null;
  } | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(initialTemplate?.name || "");
  const [role, setRole] = useState(initialTemplate?.role || "");
  const [objective, setObjective] = useState(initialTemplate?.description || "");
  const [personality, setPersonality] = useState("Professional, proactive, concise");
  const [skills, setSkills] = useState(() => {
    try {
      return (JSON.parse(initialTemplate?.capabilities || "[]") as string[]).join(", ");
    } catch {
      return "";
    }
  });
  const [tools, setTools] = useState<string[]>(() => {
    try {
      return JSON.parse(initialTemplate?.integrations || "[]") as string[];
    } catch {
      return [];
    }
  });
  const [knowledgeSources, setKnowledgeSources] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templateSlug = searchParams.get("template");

  const canSubmit = useMemo(
    () => name.trim() && role.trim() && objective.trim(),
    [name, role, objective]
  );

  function toggleTool(tool: string) {
    setTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          objective,
          personality,
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          tools,
          knowledgeSources,
          templateSlug,
        }),
      });
      const data = (await res.json()) as { error?: string; slug?: string };
      if (!res.ok) {
        setError(data.error || "Failed to create agent");
        return;
      }
      router.push(data.slug ? `/agents/${data.slug}` : "/agents");
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header title="Agent Builder" subtitle="Design a specialized AI employee for your workspace" />
      <form onSubmit={onSubmit} className="glass max-w-3xl space-y-5 rounded-2xl p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Agent name</label>
            <input className="bs-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Role</label>
            <input className="bs-input" value={role} onChange={(e) => setRole(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Objective</label>
          <textarea className="bs-input min-h-24" value={objective} onChange={(e) => setObjective(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Personality</label>
          <input className="bs-input" value={personality} onChange={(e) => setPersonality(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Skills (comma-separated)</label>
          <input className="bs-input" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Compliance analysis, Document creation" />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Tools access</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {TOOL_OPTIONS.map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => toggleTool(tool)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  tools.includes(tool)
                    ? "border-bs-accent bg-bs-accent/10 text-bs-accent"
                    : "border-bs-border text-bs-muted"
                }`}
              >
                {tool}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Knowledge sources</label>
          <textarea
            className="bs-input min-h-20"
            value={knowledgeSources}
            onChange={(e) => setKnowledgeSources(e.target.value)}
            placeholder="Drive folders, Notion docs, internal wikis..."
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button type="submit" className="bs-btn-primary" disabled={!canSubmit || loading}>
          {loading ? "Creating..." : "Create AI Agent"}
        </button>
      </form>
    </>
  );
}
