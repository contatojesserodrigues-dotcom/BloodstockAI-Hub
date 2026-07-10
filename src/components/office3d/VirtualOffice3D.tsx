"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OfficeCanvas } from "@/components/office3d/OfficeCanvas";
import { OfficePanels, dominantTaskFlowStep, type OfficeAgentRow, type OfficeLog } from "@/components/office/OfficePanels";
import { buildOfficeFeed, type OfficeAgentSnapshot } from "@/lib/office/terminal-events";
import { useAppStore } from "@/store/useAppStore";
import type { LiveAgent } from "@/lib/agent-service";
import type { LiveAgentState } from "@/lib/office3d/engine";
import "./virtual-office-3d.css";

interface Props {
  initialAgents: LiveAgent[];
  initialMetrics: { activeAgents: number; pendingApprovals: number; totalLeads: number };
  initialLogs: OfficeLog[];
  embedded?: boolean;
}

export function VirtualOffice3D({ initialAgents, initialMetrics, initialLogs, embedded = false }: Props) {
  const [agents, setAgents] = useState(initialAgents);
  const [logs, setLogs] = useState(initialLogs);
  const [metrics] = useState(initialMetrics);
  const [followSlug, setFollowSlug] = useState<string | null>(null);
  const officePrevRef = useRef<Map<string, OfficeAgentSnapshot>>(new Map());
  const addLog = useAppStore((s) => s.addLog);

  const syncAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.agents)) return;

      const next = data.agents.map((a: Record<string, string | string[] | null>) => ({
        slug: String(a.slug),
        name: String(a.name),
        role: String(a.role),
        title: String(a.role),
        room: String(a.room || ""),
        bio: String(a.bio || ""),
        tools: Array.isArray(a.tools) ? a.tools : [],
        status: String(a.status || "idle").toUpperCase().replace(/-/g, "_"),
        currentTask: String(a.currentTask || "Standing by"),
        lastAction: String(a.lastAction || ""),
        avatarColor: String(a.avatarColor || "#2563EB"),
        dbId: "",
      }));

      const snapshots: OfficeAgentSnapshot[] = next.map((a: LiveAgent) => ({
        slug: a.slug,
        name: a.name,
        room: a.room,
        status: a.status,
        currentTask: a.currentTask,
      }));
      const entries = buildOfficeFeed(snapshots, officePrevRef.current);
      for (const entry of entries) addLog({ time: entry.time, agent: entry.agent, message: entry.message });

      setAgents(next);
    } catch {
      // keep snapshot
    }
  }, [addLog]);

  const syncLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/logs?limit=10", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.logs)) {
        setLogs(
          data.logs.map((log: Record<string, string>, i: number) => ({
            id: String(log.id || `log-${i}`),
            agentName: String(log.agent || log.agentName || "Agent"),
            message: String(log.message || ""),
            time: String(log.time || "now"),
            avatarColor: "#2563EB",
          }))
        );
      }
    } catch {
      // keep
    }
  }, []);

  useEffect(() => {
    const a = setInterval(syncAgents, 6000);
    const l = setInterval(syncLogs, 5000);
    return () => { clearInterval(a); clearInterval(l); };
  }, [syncAgents, syncLogs]);

  const liveAgents: LiveAgentState[] = useMemo(
    () =>
      agents.map((a) => ({
        slug: a.slug,
        name: a.name,
        room: a.room,
        status: String(a.status),
        currentTask: a.currentTask,
        avatarColor: a.avatarColor,
      })),
    [agents]
  );

  const panelAgents: OfficeAgentRow[] = agents.map((a) => ({
    slug: a.slug,
    name: a.name,
    status: String(a.status),
    currentTask: a.currentTask,
    avatarColor: a.avatarColor,
  }));

  const activeTasks = agents.filter((a) => String(a.status).toUpperCase() !== "IDLE").length;
  const busyAgents = activeTasks;
  const activeStep = dominantTaskFlowStep(panelAgents);

  return (
    <div className={`vo3d ${embedded ? "vo3d-embedded" : ""}`}>
      <header className="vo3d-header">
        <div>
          <h1 className={embedded ? "vo3d-embedded-title" : undefined}>
            {embedded ? "Virtual Office" : "Virtual Office"}
            <span className="vo3d-live">Live</span>
          </h1>
          <p>
            {embedded
              ? "Isometric operations floor — synced with live agent backend"
              : "Premium isometric operations center — synced with Claude, Tavily, Supabase, HubSpot & n8n"}
          </p>
        </div>
        <div className="vo3d-stats-row">
          <div className="vo3d-stat"><span>{agents.length}</span><label>Online</label></div>
          <div className="vo3d-stat"><span>{busyAgents}</span><label>Busy</label></div>
          <div className="vo3d-stat"><span>{activeTasks}</span><label>Active flows</label></div>
          <div className="vo3d-stat"><span>{metrics.pendingApprovals}</span><label>Approvals</label></div>
        </div>
      </header>

      <div className="vo3d-layout">
        <aside className="vo3d-sidebar-widgets">
          <div className="vo3d-widget">
            <h3>Office Overview</h3>
            <ul>
              <li><span>Agents online</span><strong>{agents.length}</strong></li>
              <li><span>Agents busy</span><strong>{busyAgents}</strong></li>
              <li><span>Active tasks</span><strong>{activeTasks}</strong></li>
              <li><span>Approvals</span><strong>{metrics.pendingApprovals}</strong></li>
              <li><span>Leads</span><strong>{metrics.totalLeads}</strong></li>
            </ul>
          </div>
          <div className="vo3d-widget">
            <h3>Follow Agent</h3>
            <div className="vo3d-agent-pills">
              {agents.slice(0, 8).map((a) => (
                <button
                  key={a.slug}
                  type="button"
                  className={followSlug === a.slug ? "is-active" : ""}
                  onClick={() => setFollowSlug(followSlug === a.slug ? null : a.slug)}
                >
                  {a.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="vo3d-stage">
          <OfficeCanvas agents={liveAgents} followSlug={followSlug} onFollow={setFollowSlug} />
        </div>
      </div>

      <OfficePanels logs={logs} agents={panelAgents} activeStep={activeStep} />
    </div>
  );
}
