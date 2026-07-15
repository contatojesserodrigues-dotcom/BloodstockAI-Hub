"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  renderOfficeFrame,
  updateSimAgents,
  createSimAgent,
  type LiveAgentState,
  type SimAgent,
  type BubbleOverlay,
} from "@/lib/office3d/engine";

export const OfficeCanvas = memo(function OfficeCanvas({
  agents,
  followSlug,
  onFollow,
}: {
  agents: LiveAgentState[];
  followSlug?: string | null;
  onFollow?: (slug: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simsRef = useRef<Map<string, SimAgent>>(new Map());
  const camRef = useRef({ x: 0, y: 0, zoom: 1 });
  const [bubbles, setBubbles] = useState<BubbleOverlay[]>([]);
  const rafRef = useRef(0);

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

      updateSimAgents(simsRef.current, agents);

      if (followSlug) {
        const sim = simsRef.current.get(followSlug);
        if (sim) {
          const targetX = -(sim.wx - sim.wy) * 16 * camRef.current.zoom;
          const targetY = -(sim.wx + sim.wy) * 8 * camRef.current.zoom;
          camRef.current.x += (targetX - camRef.current.x) * 0.04;
          camRef.current.y += (targetY - camRef.current.y) * 0.04;
        }
      }

      const overlays = renderOfficeFrame(ctx, simsRef.current, camRef.current);
      setBubbles(overlays);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [agents, followSlug]);

  useEffect(() => {
    for (const agent of agents) {
      if (!simsRef.current.has(agent.slug)) {
        simsRef.current.set(agent.slug, createSimAgent(agent, agent.slug.length));
      }
    }
  }, [agents]);

  const pan = (dx: number, dy: number) => {
    camRef.current.x += dx;
    camRef.current.y += dy;
  };

  const zoom = (dz: number) => {
    camRef.current.zoom = Math.max(0.6, Math.min(1.6, camRef.current.zoom + dz));
  };

  return (
    <div className="vo3d-canvas-wrap">
      <div className="vo3d-camera">
        <button type="button" onClick={() => pan(0, 24)} aria-label="Pan up">↑</button>
        <button type="button" onClick={() => { camRef.current = { x: 0, y: 0, zoom: 1 }; }} aria-label="Reset">⌂</button>
        <button type="button" onClick={() => pan(0, -24)} aria-label="Pan down">↓</button>
        <button type="button" onClick={() => pan(24, 0)} aria-label="Pan left">←</button>
        <button type="button" onClick={() => zoom(0.08)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => pan(-24, 0)} aria-label="Pan right">→</button>
        <button type="button" onClick={() => zoom(-0.08)} aria-label="Zoom out">−</button>
      </div>
      <canvas ref={canvasRef} className="vo3d-canvas" />
      <div className="vo3d-bubbles">
        {bubbles.map((b) => (
          <button
            key={b.slug}
            type="button"
            className="vo3d-bubble"
            style={{ left: b.sx, top: b.sy }}
            onClick={() => onFollow?.(b.slug)}
            title={`Follow ${b.name}`}
          >
            <span className="vo3d-bubble-name">{b.name.split(" ")[0]}</span>
            <span className="vo3d-bubble-text">{b.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
