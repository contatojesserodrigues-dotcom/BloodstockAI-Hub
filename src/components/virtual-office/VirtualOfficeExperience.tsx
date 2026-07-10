"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AgentInspector } from "@/components/virtual-office/AgentInspector";
import { WORKFLOW_CHAIN } from "@/lib/virtual-office/layout";
import {
  createSim,
  hitTestAgent,
  renderFrame,
  tickSim,
  type BubbleHit,
  type LiveAgent,
} from "@/lib/virtual-office/engine";
import "./virtual-office.css";

const FLOW_LABELS: Record<string, string> = {
  "james-carter": "James — Research",
  "emma-collins": "Emma — Enrich",
  "oliver-brooks": "Oliver — HubSpot",
  "sophia-bennett": "Sophia — Draft",
  "olivia-sterling": "Olivia — Review",
  "evelyn-stone": "Evelyn — Approve",
  "amelia-scott": "Amelia — n8n",
};

export function VirtualOfficeExperience({ initialAgents }: { initialAgents: LiveAgent[] }) {
  const [agents, setAgents] = useState(initialAgents);
  const [selected, setSelected] = useState<LiveAgent | null>(null);
  const [follow, setFollow] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<BubbleHit[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simsRef = useRef(createSimMap(initialAgents));
  const camRef = useRef({ x: 0, y: 0, zoom: 1 });
  const dragRef = useRef<{ active: boolean; lx: number; ly: number }>({ active: false, lx: 0, ly: 0 });
  const rafRef = useRef(0);

  const sync = useCallback(async () => {
    try {
      const res = await fetch("/api/agents", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.agents)) return;
      setAgents(
        data.agents.map((a: Record<string, string | string[] | null>) => ({
          slug: String(a.slug),
          name: String(a.name),
          role: String(a.role),
          department: String(a.department || ""),
          room: String(a.room || ""),
          status: String(a.status || "idle").toUpperCase().replace(/-/g, "_"),
          currentTask: String(a.currentTask || ""),
          lastAction: String(a.lastAction || ""),
          tools: Array.isArray(a.tools) ? (a.tools as string[]) : [],
          avatarColor: String(a.avatarColor || "#4A6FA5"),
        }))
      );
    } catch {
      // keep
    }
  }, []);

  useEffect(() => {
    sync();
    const t = setInterval(sync, 6000);
    return () => clearInterval(t);
  }, [sync]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const loop = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      tickSim(simsRef.current, agents);
      if (follow) {
        const sim = simsRef.current.get(follow);
        if (sim) {
          camRef.current.x += ((500 - sim.x) * 0.4 - camRef.current.x) * 0.03;
          camRef.current.y += ((120 - sim.y) * 0.3 - camRef.current.y) * 0.03;
        }
      }
      setBubbles(renderFrame(ctx, simsRef.current, camRef.current));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const onDown = (e: MouseEvent) => {
      dragRef.current = { active: true, lx: e.clientX, ly: e.clientY };
    };
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      camRef.current.x += e.clientX - dragRef.current.lx;
      camRef.current.y += e.clientY - dragRef.current.ly;
      dragRef.current.lx = e.clientX;
      dragRef.current.ly = e.clientY;
    };
    const onUp = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const moved = Math.abs(e.clientX - dragRef.current.lx) + Math.abs(e.clientY - dragRef.current.ly);
      if (moved < 6) {
        const slug = hitTestAgent(simsRef.current, mx, my, camRef.current, rect.width);
        if (slug) {
          const ag = agents.find((a) => a.slug === slug) || null;
          setSelected(ag);
        }
      }
      dragRef.current.active = false;
    };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [agents, follow]);

  const activeFlow = WORKFLOW_CHAIN.find((slug) => {
    const a = agents.find((x) => x.slug === slug);
    return a && String(a.status).toUpperCase() !== "IDLE" && String(a.status).toUpperCase() !== "COMPLETED";
  });

  return (
    <div className="vo-premium">
      <header className="vo-premium-header">
        <h1>
          Operations Center
          <span className="vo-premium-badge">Live</span>
        </h1>
        <p>Corporate headquarters — agents working in real time, synced with your backend</p>
      </header>

      <div className={`vo-premium-grid ${selected ? "has-inspector" : ""}`}>
        <div className="vo-premium-stage">
          <div className="vo-premium-controls">
            <button type="button" onClick={() => { camRef.current.zoom = Math.min(1.5, camRef.current.zoom + 0.1); }}>Zoom +</button>
            <button type="button" onClick={() => { camRef.current.zoom = Math.max(0.6, camRef.current.zoom - 0.1); }}>Zoom −</button>
            <button type="button" onClick={() => { camRef.current = { x: 0, y: 0, zoom: 1 }; setFollow(null); }}>Reset</button>
            {follow && (
              <button type="button" onClick={() => setFollow(null)}>Unfollow</button>
            )}
          </div>
          <div className="vo-premium-canvas-wrap">
            <canvas ref={canvasRef} className="vo-premium-canvas" />
            <div className="vo-premium-bubbles">
              {bubbles.map((b) => (
                <div key={b.slug} className="vo-premium-bubble" style={{ left: b.sx, top: b.sy }}>
                  <strong>{b.name.split(" ")[0]}</strong>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="vo-premium-minimap">
          <h3>Task Flow</h3>
          <div className="vo-premium-flow">
            {WORKFLOW_CHAIN.map((slug) => (
              <button
                key={slug}
                type="button"
                className={`vo-premium-flow-step ${activeFlow === slug ? "is-active" : ""}`}
                onClick={() => {
                  setFollow(slug);
                  const ag = agents.find((a) => a.slug === slug) || null;
                  setSelected(ag);
                }}
              >
                <span className="dot" />
                {FLOW_LABELS[slug] || slug}
              </button>
            ))}
          </div>
          <h3 style={{ marginTop: "1rem" }}>Agents online</h3>
          <p style={{ fontSize: "0.7rem", color: "var(--vo-muted)" }}>{agents.length} active specialists</p>
        </div>

        {selected && (
          <AgentInspector agent={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}

function createSimMap(agents: LiveAgent[]) {
  const m = new Map();
  for (const a of agents) m.set(a.slug, createSim(a));
  return m;
}
