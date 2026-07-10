import { DEPARTMENTS, ROOM_TO_DEPT, waypointInDepartment } from "@/lib/office3d/departments";
import { getAgentProfile, poseForStatus, type AgentPose } from "@/lib/office3d/agents";
import { OFFICE_THEME } from "@/lib/office3d/theme";
import { TILE_H, TILE_W, easeInOut, lerp, toIso } from "@/lib/office3d/isometric";

export interface LiveAgentState {
  slug: string;
  name: string;
  room: string;
  status: string;
  currentTask: string;
  avatarColor: string;
}

export interface SimAgent {
  slug: string;
  name: string;
  wx: number;
  wy: number;
  targetWx: number;
  targetWy: number;
  progress: number;
  facing: 1 | -1;
  pose: AgentPose;
  bubble: string;
  animPhase: number;
  deptId: string;
  seed: number;
}

function deptForAgent(room: string, status: string) {
  const key = status.toUpperCase().replace(/-/g, "_");
  if (key === "WAITING_APPROVAL") return "meeting";
  if (key === "COMPLETED") return "meeting";
  if (key === "IDLE") return "lounge";
  return ROOM_TO_DEPT[room] || "operations";
}

export function createSimAgent(agent: LiveAgentState, seed: number): SimAgent {
  const deptId = deptForAgent(agent.room, agent.status);
  const wp = waypointInDepartment(deptId, seed);
  const profile = getAgentProfile(agent.slug);
  return {
    slug: agent.slug,
    name: profile.name,
    wx: wp.x,
    wy: wp.y,
    targetWx: wp.x,
    targetWy: wp.y,
    progress: 1,
    facing: 1,
    pose: poseForStatus(agent.status),
    bubble: agent.currentTask || profile.role,
    animPhase: Math.random(),
    deptId,
    seed,
  };
}

export function updateSimAgents(sims: Map<string, SimAgent>, live: LiveAgentState[]) {
  for (const agent of live) {
    const existing = sims.get(agent.slug);
    const deptId = deptForAgent(agent.room, agent.status);
    const profile = getAgentProfile(agent.slug);

    if (!existing) {
      sims.set(agent.slug, createSimAgent(agent, profile.slug.length));
      continue;
    }

    const statusChanged = existing.pose !== poseForStatus(agent.status);
    const taskChanged = existing.bubble !== agent.currentTask;
    const deptChanged = existing.deptId !== deptId;

    existing.pose = poseForStatus(agent.status);
    existing.bubble = agent.currentTask || existing.bubble;

    if ((statusChanged || taskChanged || deptChanged) && existing.progress >= 1) {
      existing.seed += 1;
      const wp = waypointInDepartment(deptId, existing.seed);
      existing.targetWx = wp.x;
      existing.targetWy = wp.y;
      existing.deptId = deptId;
      existing.facing = wp.x >= existing.wx ? 1 : -1;
      existing.progress = 0;
    }

    if (existing.progress < 1) {
      existing.progress = Math.min(1, existing.progress + 0.018);
      const t = easeInOut(existing.progress);
      existing.wx = lerp(existing.wx, existing.targetWx, t * 0.12 + 0.02);
      existing.wy = lerp(existing.wy, existing.targetWy, t * 0.12 + 0.02);
      existing.pose = "walk";
    } else if (Math.random() < 0.008) {
      const wp = waypointInDepartment(existing.deptId, existing.seed + Math.floor(Math.random() * 8));
      existing.targetWx = wp.x;
      existing.targetWy = wp.y;
      existing.facing = wp.x >= existing.wx ? 1 : -1;
      existing.progress = 0;
      existing.seed += 1;
    } else {
      existing.pose = poseForStatus(agent.status);
    }

    existing.animPhase += 0.02;
  }
}

function drawIsoFloor(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number) {
  const originX = ctx.canvas.width / 2 + camX;
  const originY = 80 + camY;

  for (const dept of DEPARTMENTS) {
    const corners = [
      toIso(dept.x, dept.y),
      toIso(dept.x + dept.w, dept.y),
      toIso(dept.x + dept.w, dept.y + dept.h),
      toIso(dept.x, dept.y + dept.h),
    ].map((p) => ({ x: originX + p.x * zoom, y: originY + p.y * zoom }));

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();

    const grad = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
    grad.addColorStop(0, dept.floor);
    grad.addColorStop(1, "#0a1525");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = dept.accent + "55";
    ctx.lineWidth = 1;
    ctx.stroke();

    const label = toIso(dept.x + dept.w / 2, dept.y + 0.5);
    ctx.fillStyle = OFFICE_THEME.textMuted;
    ctx.font = `${10 * zoom}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(dept.label, originX + label.x * zoom, originY + label.y * zoom - 8 * zoom);

    drawFurniture(ctx, dept, originX, originY, zoom);
  }
}

function drawFurniture(
  ctx: CanvasRenderingContext2D,
  dept: (typeof DEPARTMENTS)[0],
  ox: number,
  oy: number,
  zoom: number
) {
  dept.furniture.forEach((type, i) => {
    const fx = dept.x + 1.5 + (i % 3) * 2.5;
    const fy = dept.y + 1.5 + Math.floor(i / 3) * 2;
    const p = toIso(fx, fy);
    const x = ox + p.x * zoom;
    const y = oy + p.y * zoom;

    if (type === "desk") {
      ctx.fillStyle = OFFICE_THEME.wood;
      ctx.fillRect(x - 14 * zoom, y - 4 * zoom, 28 * zoom, 10 * zoom);
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(x - 10 * zoom, y - 10 * zoom, 20 * zoom, 8 * zoom);
    } else if (type === "monitor") {
      ctx.fillStyle = OFFICE_THEME.aluminum;
      ctx.fillRect(x - 6 * zoom, y - 14 * zoom, 12 * zoom, 10 * zoom);
      ctx.fillStyle = "#1E293B";
      ctx.fillRect(x - 5 * zoom, y - 13 * zoom, 10 * zoom, 7 * zoom);
    } else if (type === "chair") {
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.ellipse(x, y, 6 * zoom, 3 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "plant") {
      ctx.fillStyle = "#92400E";
      ctx.fillRect(x - 1 * zoom, y - 2 * zoom, 2 * zoom, 6 * zoom);
      ctx.fillStyle = OFFICE_THEME.plant;
      ctx.beginPath();
      ctx.arc(x, y - 6 * zoom, 5 * zoom, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "glass") {
      ctx.strokeStyle = OFFICE_THEME.glass;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 12 * zoom, y - 16 * zoom, 24 * zoom, 18 * zoom);
    } else if (type === "sofa") {
      ctx.fillStyle = "#64748B";
      ctx.fillRect(x - 16 * zoom, y - 6 * zoom, 32 * zoom, 10 * zoom);
    } else if (type === "server") {
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(x - 8 * zoom, y - 14 * zoom, 16 * zoom, 18 * zoom);
      ctx.fillStyle = "#06B6D4";
      for (let r = 0; r < 3; r++) ctx.fillRect(x - 6 * zoom, y - 12 * zoom + r * 5 * zoom, 12 * zoom, 2 * zoom);
    } else if (type === "board") {
      ctx.fillStyle = "#F8FAFC";
      ctx.fillRect(x - 14 * zoom, y - 18 * zoom, 28 * zoom, 14 * zoom);
      ctx.strokeStyle = "#CBD5E1";
      ctx.strokeRect(x - 14 * zoom, y - 18 * zoom, 28 * zoom, 14 * zoom);
    }
  });
}

function drawAgentFigure(
  ctx: CanvasRenderingContext2D,
  sim: SimAgent,
  ox: number,
  oy: number,
  zoom: number
) {
  const profile = getAgentProfile(sim.slug);
  const p = toIso(sim.wx, sim.wy);
  const x = ox + p.x * zoom;
  const y = oy + p.y * zoom;
  const h = profile.height;
  const bob = sim.pose === "walk" ? Math.sin(sim.animPhase * 8) * 2 * zoom : 0;

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(sim.facing * h, h);

  ctx.fillStyle = OFFICE_THEME.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 4 * zoom, 8 * zoom, 3 * zoom, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = profile.pants;
  ctx.fillRect(-5 * zoom, -2 * zoom, 10 * zoom, 14 * zoom);

  const outfitGrad = ctx.createLinearGradient(0, -16 * zoom, 0, -2 * zoom);
  outfitGrad.addColorStop(0, profile.outfit);
  outfitGrad.addColorStop(1, profile.outfit);
  ctx.fillStyle = outfitGrad;
  ctx.beginPath();
  ctx.moveTo(-7 * zoom, -2 * zoom);
  ctx.lineTo(-6 * zoom, -18 * zoom);
  ctx.lineTo(6 * zoom, -18 * zoom);
  ctx.lineTo(7 * zoom, -2 * zoom);
  ctx.closePath();
  ctx.fill();

  const skinGrad = ctx.createRadialGradient(0, -22 * zoom, 1, 0, -22 * zoom, 6 * zoom);
  skinGrad.addColorStop(0, profile.skin);
  skinGrad.addColorStop(1, profile.skin + "99");
  ctx.fillStyle = skinGrad;
  ctx.beginPath();
  ctx.arc(0, -22 * zoom, 5.5 * zoom, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = profile.hair;
  if (profile.hairStyle === "long") {
    ctx.fillRect(-6 * zoom, -28 * zoom, 12 * zoom, 8 * zoom);
  } else if (profile.hairStyle === "bun") {
    ctx.beginPath();
    ctx.arc(4 * zoom, -28 * zoom, 3 * zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-5 * zoom, -28 * zoom, 10 * zoom, 5 * zoom);
  } else {
    ctx.fillRect(-5.5 * zoom, -28 * zoom, 11 * zoom, 5 * zoom);
  }

  if (profile.accessory === "glasses") {
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.strokeRect(-4 * zoom, -23 * zoom, 3.5 * zoom, 2.5 * zoom);
    ctx.strokeRect(0.5 * zoom, -23 * zoom, 3.5 * zoom, 2.5 * zoom);
  }

  if (sim.pose === "type" || sim.pose === "think") {
    ctx.fillStyle = "#94A3B8";
    ctx.fillRect(6 * zoom, -14 * zoom, 8 * zoom, 5 * zoom);
  }

  ctx.restore();
}

export interface BubbleOverlay {
  slug: string;
  name: string;
  text: string;
  sx: number;
  sy: number;
}

export function renderOfficeFrame(
  ctx: CanvasRenderingContext2D,
  sims: Map<string, SimAgent>,
  cam: { x: number; y: number; zoom: number }
): BubbleOverlay[] {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, OFFICE_THEME.bgGradient[0]);
  bg.addColorStop(0.5, OFFICE_THEME.bgGradient[1]);
  bg.addColorStop(1, OFFICE_THEME.bgGradient[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const originX = width / 2 + cam.x;
  const originY = 80 + cam.y;
  const zoom = cam.zoom;

  drawIsoFloor(ctx, cam.x, cam.y, zoom);

  const sorted = [...sims.values()].sort((a, b) => a.wy + a.wx - (b.wy + b.wx));
  const bubbles: BubbleOverlay[] = [];

  for (const sim of sorted) {
    drawAgentFigure(ctx, sim, originX, originY, zoom);
    const p = toIso(sim.wx, sim.wy);
    bubbles.push({
      slug: sim.slug,
      name: sim.name,
      text: sim.bubble,
      sx: originX + p.x * zoom,
      sy: originY + p.y * zoom - 42 * zoom,
    });
  }

  return bubbles;
}

export { TILE_W, TILE_H };
