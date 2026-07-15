"use client";

import { memo } from "react";
import { AgentAvatar } from "@/components/ui/AgentAvatar";
import { TASK_FLOW_STEPS, taskFlowStepForStatus } from "@/lib/office/activities";

export interface OfficeLog {
  id: string;
  agentName: string;
  message: string;
  time: string;
  avatarColor?: string;
}

export interface OfficeAgentRow {
  slug: string;
  name: string;
  status: string;
  currentTask: string;
  avatarColor: string;
}

export const OfficePanels = memo(function OfficePanels({
  logs,
  agents,
  activeStep,
}: {
  logs: OfficeLog[];
  agents: OfficeAgentRow[];
  activeStep: string;
}) {
  const statusColor = (status: string) => {
    const key = status.toUpperCase().replace(/-/g, "_");
    if (key === "WAITING_APPROVAL") return "bg-purple-500";
    if (key === "COMPLETED") return "bg-green-700";
    if (["RESEARCHING", "MONITORING", "UPDATING_CRM", "WRITING", "ANALYZING"].includes(key)) return "bg-green-500";
    if (key === "IDLE") return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="vo-panels">
      <div className="vo-panel vo-panel-yellow">
        <h3 className="vo-panel-title">Live Activities</h3>
        <div className="vo-panel-list">
          {logs.slice(0, 6).map((log) => (
            <div key={log.id} className="vo-activity-row">
              <AgentAvatar name={log.agentName} color={log.avatarColor || "#3B82F6"} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="vo-panel-text truncate">{log.message}</p>
                <p className="vo-panel-meta">{log.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="vo-panel vo-panel-purple">
        <h3 className="vo-panel-title">Agent Status</h3>
        <div className="vo-panel-list">
          {agents.slice(0, 8).map((agent) => (
            <div key={agent.slug} className="vo-status-row">
              <AgentAvatar name={agent.name} color={agent.avatarColor} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="vo-panel-text truncate">{agent.name}</p>
                <p className="vo-panel-meta truncate">{agent.currentTask}</p>
              </div>
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusColor(agent.status)}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="vo-panel vo-panel-red">
        <h3 className="vo-panel-title">Task Flow</h3>
        <div className="vo-task-flow">
          {TASK_FLOW_STEPS.map((step) => (
            <div
              key={step.id}
              className={`vo-task-step ${activeStep === step.id ? "is-active" : ""}`}
              style={{ backgroundColor: step.color }}
            >
              {step.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export function dominantTaskFlowStep(agents: OfficeAgentRow[]): string {
  const counts = new Map<string, number>();
  for (const agent of agents) {
    const step = taskFlowStepForStatus(agent.status);
    counts.set(step, (counts.get(step) || 0) + 1);
  }
  let best = "running";
  let max = 0;
  for (const [step, count] of counts) {
    if (count > max) {
      max = count;
      best = step;
    }
  }
  return best;
}
