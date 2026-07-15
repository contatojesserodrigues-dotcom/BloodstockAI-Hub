"use client";

import { memo } from "react";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { LiveAgent } from "@/lib/virtual-office/engine";

export const AgentInspector = memo(function AgentInspector({
  agent,
  onClose,
}: {
  agent: LiveAgent | null;
  onClose: () => void;
}) {
  if (!agent) return null;

  return (
    <aside className="vo-insp">
      <div className="vo-insp-head">
        <h3>Agent Profile</h3>
        <button type="button" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="vo-insp-body">
        <div className="vo-insp-hero">
          <AgentAvatar name={agent.name} color={agent.avatarColor} size="lg" />
          <div>
            <p className="vo-insp-name">{agent.name}</p>
            <p className="vo-insp-role">{agent.role}</p>
            <p className="vo-insp-dept">{agent.department}</p>
          </div>
        </div>
        <div className="vo-insp-row">
          <span>Status</span>
          <StatusBadge status={agent.status} />
        </div>
        <div className="vo-insp-block">
          <span className="vo-insp-label">Current task</span>
          <p>{agent.currentTask}</p>
        </div>
        <div className="vo-insp-block">
          <span className="vo-insp-label">Last activity</span>
          <p>{agent.lastAction}</p>
        </div>
        <div className="vo-insp-block">
          <span className="vo-insp-label">Tools</span>
          <div className="vo-insp-tools">
            {agent.tools.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
        <div className="vo-insp-metrics">
          <div><span>Runtime</span><strong>Live</strong></div>
          <div><span>Queue</span><strong>Active</strong></div>
        </div>
      </div>
    </aside>
  );
});
