"use client";

import { memo } from "react";
import { AgentCharacter } from "@/components/office/AgentCharacter";
import { getCharacterStyle } from "@/lib/office/characters";
import { getActivityMeta } from "@/lib/office/activities";
import type { OfficePoint } from "@/lib/office/zones";

export interface SceneAgent {
  slug: string;
  name: string;
  role: string;
  room: string;
  status: string;
  currentTask: string;
  avatarColor: string;
  x: number;
  y: number;
  facing: "left" | "right";
  walking: boolean;
}

export const OfficeScene = memo(function OfficeScene({
  agents,
  pan,
  stats,
}: {
  agents: SceneAgent[];
  pan: { x: number; y: number };
  stats: { online: number; tasks: number; approvals: number };
}) {
  return (
    <div className="vo-scene-wrap">
      <div className="vo-scene" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
        <div className="vo-overview-card">
          <p className="vo-overview-title">Office Overview</p>
          <div className="vo-overview-grid">
            <div>
              <span className="vo-overview-value">{stats.online}</span>
              <span className="vo-overview-label">Agents Online</span>
            </div>
            <div>
              <span className="vo-overview-value">{stats.tasks}</span>
              <span className="vo-overview-label">Tasks Active</span>
            </div>
            <div>
              <span className="vo-overview-value">{stats.approvals}</span>
              <span className="vo-overview-label">Approvals</span>
            </div>
          </div>
          <div className="vo-live-pill">
            <span className="vo-live-dot" />
            Live Activity
          </div>
        </div>

        <svg className="vo-floor-svg" viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden>
          <defs>
            <pattern id="vo-wood" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="#C4A882" />
              <path d="M0 2 H4" stroke="#B8956E" strokeWidth="0.2" />
            </pattern>
            <linearGradient id="vo-glass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(147,197,253,0.35)" />
              <stop offset="100%" stopColor="rgba(59,130,246,0.15)" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="100" height="80" fill="url(#vo-wood)" rx="1" />

          {/* Meeting room */}
          <rect x="48" y="24" width="16" height="14" fill="url(#vo-glass)" stroke="#93C5FD" strokeWidth="0.3" />
          <rect x="52" y="30" width="8" height="4" rx="0.5" fill="#64748B" opacity="0.5" />
          <text x="56" y="23" textAnchor="middle" className="vo-room-label">Meeting Room</text>

          {/* Lounge */}
          <rect x="64" y="58" width="18" height="14" fill="#E2E8F0" opacity="0.35" rx="0.8" />
          <rect x="67" y="62" width="12" height="4" rx="1" fill="#94A3B8" opacity="0.7" />
          <rect x="70" y="58" width="6" height="2" rx="0.5" fill="#CBD5E1" />
          <text x="73" y="57" textAnchor="middle" className="vo-room-label">Lounge</text>

          {/* Desks */}
          {[
            [12, 36, 10, 6],
            [18, 44, 10, 6],
            [30, 26, 10, 6],
            [40, 46, 10, 6],
            [66, 30, 10, 6],
            [76, 46, 10, 6],
          ].map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} fill="#D6C4A8" stroke="#A89070" strokeWidth="0.2" rx="0.4" />
              <rect x={x + 2} y={y + 1} width={w - 4} height={h - 3} fill="#1E293B" opacity="0.55" rx="0.3" />
            </g>
          ))}

          {/* Plants */}
          {[
            [8, 58],
            [24, 68],
            [44, 68],
            [86, 22],
            [90, 58],
          ].map(([x, y], i) => (
            <g key={`plant-${i}`}>
              <rect x={x} y={y + 2} width="2" height="3" fill="#92400E" />
              <circle cx={x + 1} cy={y + 1} r="2.5" fill="#16A34A" />
              <circle cx={x + 2.5} cy={y} r="2" fill="#22C55E" />
            </g>
          ))}

          {/* Bookshelves */}
          <rect x="82" y="18" width="6" height="12" fill="#78350F" opacity="0.7" />
          <line x1="82" y1="21" x2="88" y2="21" stroke="#FDE68A" strokeWidth="0.3" />
          <line x1="82" y1="24" x2="88" y2="24" stroke="#FCA5A5" strokeWidth="0.3" />
          <line x1="82" y1="27" x2="88" y2="27" stroke="#93C5FD" strokeWidth="0.3" />
        </svg>

        {agents.map((agent) => {
          const style = getCharacterStyle(agent.slug, agent.avatarColor);
          const activity = getActivityMeta(agent.status, agent.currentTask);
          const ActivityIcon = activity.icon;

          return (
            <div
              key={agent.slug}
              className={`vo-agent ${agent.walking ? "is-walking" : ""}`}
              style={{ left: `${agent.x}%`, top: `${agent.y}%` }}
            >
              <div className="vo-bubble">
                <ActivityIcon className="vo-bubble-icon" />
                <span>{activity.bubble}</span>
              </div>
              <div className="vo-agent-body">
                <AgentCharacter
                  style={style}
                  facing={agent.facing}
                  pose={activity.pose}
                  walking={agent.walking}
                  scale={1.15}
                />
              </div>
              <div className="vo-agent-name">{agent.name.split(" ")[0]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export function lerpPoint(from: OfficePoint, to: OfficePoint, t: number): OfficePoint {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}
