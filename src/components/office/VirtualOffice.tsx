"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OfficeScene, type SceneAgent, lerpPoint } from "@/components/office/OfficeScene";
import {
  OfficePanels,
  dominantTaskFlowStep,
  type OfficeAgentRow,
  type OfficeLog,
} from "@/components/office/OfficePanels";
import { zoneForAgent, pickWaypoint } from "@/lib/office/zones";
import { buildOfficeFeed, type OfficeAgentSnapshot } from "@/lib/office/terminal-events";
import { useAppStore } from "@/store/useAppStore";
import type { LiveAgent } from "@/lib/agent-service";
import "./virtual-office.css";

interface VirtualOfficeProps {
  initialAgents: LiveAgent[];
  initialMetrics: {
    activeAgents: number;
    pendingApprovals: number;
    totalLeads: number;
  };
  initialLogs: OfficeLog[];
}

interface AgentSimState {
  slug: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facing: "left" | "right";
  walking: boolean;
  progress: number;
  zoneSeed: number;
  room: string;
  status: string;
  currentTask: string;
}

function formatLogTime(isoOrLabel: string) {
  if (!isoOrLabel) return "just now";
  const date = new Date(isoOrLabel);
  if (Number.isNaN(date.getTime())) return isoOrLabel;
  const diff = Math.max(0, Date.now() - date.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

function seedFromSlug(slug: string) {
  return slug.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

export function VirtualOffice({ initialAgents, initialMetrics, initialLogs }: VirtualOfficeProps) {
  const [agents, setAgents] = useState(initialAgents);
  const [logs, setLogs] = useState(initialLogs);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const simRef = useRef<Map<string, AgentSimState>>(new Map());
  const officePrevRef = useRef<Map<string, OfficeAgentSnapshot>>(new Map());
  const addLog = useAppStore((s) => s.addLog);
  const [, tick] = useState(0);

  const syncAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.agents)) {
        const nextAgents = data.agents.map((a: Record<string, string | string[] | null>) => ({
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
          avatarColor: String(a.avatarColor || "#3B82F6"),
          dbId: "",
        }));

        const officeSnapshots: OfficeAgentSnapshot[] = nextAgents.map((a: LiveAgent) => ({
          slug: a.slug,
          name: a.name,
          room: a.room,
          status: a.status,
          currentTask: a.currentTask,
        }));
        const officeEntries = buildOfficeFeed(officeSnapshots, officePrevRef.current);
        for (const entry of officeEntries) {
          addLog({ time: entry.time, agent: entry.agent, message: entry.message });
        }

        setAgents(nextAgents);
      }
    } catch {
      // keep last snapshot
    }
  }, [addLog]);

  const syncLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/logs?limit=8", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.logs)) {
        setLogs(
          data.logs.map((log: Record<string, string>, i: number) => ({
            id: String(log.id || `log-${i}`),
            agentName: String(log.agentName || log.agent || "Agent"),
            message: String(log.message || ""),
            time: formatLogTime(String(log.time || log.createdAt || "")),
            avatarColor: "#3B82F6",
          }))
        );
      }
    } catch {
      // keep last snapshot
    }
  }, []);

  useEffect(() => {
    const agentTimer = setInterval(syncAgents, 8000);
    const logTimer = setInterval(syncLogs, 6000);
    return () => {
      clearInterval(agentTimer);
      clearInterval(logTimer);
    };
  }, [syncAgents, syncLogs]);

  useEffect(() => {
    const frame = setInterval(() => {
      const sims = simRef.current;
      for (const agent of agents) {
        const zone = zoneForAgent(agent.room, agent.status);
        const existing = sims.get(agent.slug);
        const seed = seedFromSlug(agent.slug);

        if (!existing) {
          const point = pickWaypoint(zone, seed);
          sims.set(agent.slug, {
            slug: agent.slug,
            x: point.x,
            y: point.y,
            targetX: point.x,
            targetY: point.y,
            facing: "right",
            walking: false,
            progress: 1,
            zoneSeed: seed,
            room: agent.room,
            status: agent.status,
            currentTask: agent.currentTask,
          });
          continue;
        }

        const statusChanged = existing.status !== agent.status;
        const taskChanged = existing.currentTask !== agent.currentTask;
        const roomChanged = existing.room !== agent.room;

        if ((statusChanged || taskChanged || roomChanged) && existing.progress >= 1) {
          const nextZone = zoneForAgent(agent.room, agent.status);
          existing.zoneSeed += 1;
          const next = pickWaypoint(nextZone, existing.zoneSeed + seed);
          existing.targetX = next.x;
          existing.targetY = next.y;
          existing.facing = next.x >= existing.x ? "right" : "left";
          existing.walking = true;
          existing.progress = 0;
        }

        existing.room = agent.room;
        existing.status = agent.status;
        existing.currentTask = agent.currentTask;

        if (existing.progress < 1) {
          existing.progress = Math.min(1, existing.progress + 0.04);
          const point = lerpPoint(
            { x: existing.x, y: existing.y },
            { x: existing.targetX, y: existing.targetY },
            existing.progress
          );
          existing.x = point.x;
          existing.y = point.y;
          if (existing.progress >= 1) {
            existing.walking = false;
          }
        } else if (Math.random() < 0.02) {
          const patrol = pickWaypoint(zoneForAgent(agent.room, agent.status), existing.zoneSeed + Math.floor(Math.random() * 5));
          existing.targetX = patrol.x;
          existing.targetY = patrol.y;
          existing.facing = patrol.x >= existing.x ? "right" : "left";
          existing.walking = true;
          existing.progress = 0;
          existing.zoneSeed += 1;
        }
      }

      tick((n) => n + 1);
    }, 50);

    return () => clearInterval(frame);
  }, [agents]);

  const sceneAgents: SceneAgent[] = useMemo(() => {
    return agents.map((agent) => {
      const sim = simRef.current.get(agent.slug);
      return {
        slug: agent.slug,
        name: agent.name,
        role: agent.role,
        room: agent.room,
        status: agent.status,
        currentTask: agent.currentTask,
        avatarColor: agent.avatarColor,
        x: sim?.x ?? 50,
        y: sim?.y ?? 50,
        facing: sim?.facing ?? "right",
        walking: sim?.walking ?? false,
      };
    });
  }, [agents, tick]);

  const panelAgents: OfficeAgentRow[] = agents.map((a) => ({
    slug: a.slug,
    name: a.name,
    status: a.status,
    currentTask: a.currentTask,
    avatarColor: a.avatarColor,
  }));

  const activeTasks = agents.filter((a) => a.status !== "IDLE").length;
  const activeStep = dominantTaskFlowStep(panelAgents);

  return (
    <div className="virtual-office">
      <header className="vo-header mb-6 flex flex-col gap-3 sm:mb-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight md:text-3xl">
            Virtual Office
            <span className="vo-live-badge">
              <span className="vo-live-dot" />
              Live
            </span>
          </h1>
          <p className="mt-1 text-sm">
            Interactive AI office — agents move, collaborate and sync with live operations
          </p>
        </div>
      </header>

      <div className="vo-main-card">
        <div className="vo-scene-wrap">
          <div className="vo-camera" aria-label="Office camera controls">
            <button type="button" onClick={() => setPan((p) => ({ ...p, y: p.y + 12 }))}>↑</button>
            <button type="button" onClick={() => setPan({ x: 0, y: 0 })}>⌂</button>
            <button type="button" onClick={() => setPan((p) => ({ ...p, y: p.y - 12 }))}>↓</button>
            <button type="button" onClick={() => setPan((p) => ({ ...p, x: p.x + 16 }))}>←</button>
            <span />
            <button type="button" onClick={() => setPan((p) => ({ ...p, x: p.x - 16 }))}>→</button>
          </div>
          <OfficeScene
            agents={sceneAgents}
            pan={pan}
            stats={{
              online: agents.length,
              tasks: activeTasks,
              approvals: metrics.pendingApprovals,
            }}
          />
        </div>
      </div>

      <OfficePanels logs={logs} agents={panelAgents} activeStep={activeStep} />
    </div>
  );
}
