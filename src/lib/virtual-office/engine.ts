import { VO } from "@/lib/virtual-office/theme";
import { ROOMS, deskPoint, roomForAgent } from "@/lib/virtual-office/layout";
import { getVisual, poseFromStatus, type AgentPose } from "@/lib/virtual-office/agents";

const PERSPECTIVE = 0.55;
const SCALE = 0.85;

export interface LiveAgent {
  slug: string;
  name: string;
  role: string;
  department: string;
  room: string;
  status: string;
  currentTask: string;
  lastAction: string;
  tools: string[];
  avatarColor: string;
}

export interface SimAgent {
  slug: string;
  name: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  progress: number;
  facing: 1 | -1;
  pose: AgentPose;
  bubble: string;
  roomId: string;
  phase: number;
  seed: number;
}

export interface BubbleHit {
  slug: string;
  name: string;
  text: string;
  sx: number;
  sy: number;
}

function project(wx: number, wy: number, ox: number, oy: number, zoom: number) {
  const sx = ox + (wx - 500) * SCALE * zoom;
  const sy = oy + wy * PERSPECTIVE * SCALE * zoom;
  return { x: sx, y: sy, depth: wy + wx * 0.3 };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, t);
}

export function createSim(agent: LiveAgent): SimAgent {
  const roomId = roomForAgent(agent.slug, agent.status);
  const pt = deskPoint(roomId, agent.slug.length);
  return {
    slug: agent.slug,
    name: agent.name,
    x: pt.x,
    y: pt.y,
    tx: pt.x,
    ty: pt.y,
    progress: 1,
    facing: 1,
    pose: poseFromStatus(agent.status),
    bubble: agent.currentTask || agent.lastAction,
    roomId,
    phase: Math.random() * Math.PI * 2,
    seed: agent.slug.length,
  };
}

export function tickSim(sims: Map<string, SimAgent>, live: LiveAgent[]) {
  for (const agent of live) {
    let sim = sims.get(agent.slug);
    if (!sim) {
      sim = createSim(agent);
      sims.set(agent.slug, sim);
      continue;
    }

    const nextRoom = roomForAgent(agent.slug, agent.status);
    const statusPose = poseFromStatus(agent.status);
    sim.bubble = agent.currentTask || agent.lastAction || sim.bubble;
    sim.phase += 0.025;

    if (nextRoom !== sim.roomId && sim.progress >= 1) {
      sim.roomId = nextRoom;
      sim.seed += 1;
      const pt = deskPoint(nextRoom, sim.seed);
      sim.tx = pt.x;
      sim.ty = pt.y;
      sim.facing = pt.x >= sim.x ? 1 : -1;
      sim.progress = 0;
    }

    if (sim.progress < 1) {
      sim.progress = Math.min(1, sim.progress + 0.012);
      const t = sim.progress * sim.progress * (3 - 2 * sim.progress);
      sim.x = lerp(sim.x, sim.tx, t * 0.15 + 0.02);
      sim.y = lerp(sim.y, sim.ty, t * 0.15 + 0.02);
      sim.pose = "walk";
    } else if (Math.random() < 0.004) {
      const pt = deskPoint(sim.roomId, sim.seed + Math.floor(Math.random() * 6));
      sim.tx = pt.x;
      sim.ty = pt.y;
      sim.facing = pt.x >= sim.x ? 1 : -1;
      sim.progress = 0;
      sim.seed += 1;
    } else {
      sim.pose = statusPose;
    }
  }
}

function drawRoom(
  ctx: CanvasRenderingContext2D,
  room: (typeof ROOMS)[0],
  ox: number,
  oy: number,
  zoom: number
) {
  const tl = project(room.x, room.y, ox, oy, zoom);
  const br = project(room.x + room.w, room.y + room.h, ox, oy, zoom);
  const w = br.x - tl.x;
  const h = br.y - tl.y;

  ctx.fillStyle = room.floor;
  ctx.fillRect(tl.x, tl.y, w, h);

  const wallGrad = ctx.createLinearGradient(tl.x, tl.y, tl.x, br.y);
  wallGrad.addColorStop(0, VO.wall);
  wallGrad.addColorStop(1, "rgba(42,51,68,0.4)");
  ctx.fillStyle = wallGrad;
  ctx.fillRect(tl.x, tl.y, w, 3 * zoom);
  ctx.fillRect(tl.x, tl.y, 3 * zoom, h);

  if (room.type === "meeting" || room.type === "office") {
    ctx.strokeStyle = VO.glass;
    ctx.lineWidth = 1;
    ctx.strokeRect(tl.x + 4, tl.y + 4, w - 8, h - 8);
  }

  ctx.fillStyle = VO.muted;
  ctx.font = `${Math.max(8, 9 * zoom)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(room.label, tl.x + 8, tl.y + 16 * zoom);

  if (room.type !== "corridor") {
    drawFurniture(ctx, room, tl.x, tl.y, w, h, zoom);
  }
}

function drawFurniture(
  ctx: CanvasRenderingContext2D,
  room: (typeof ROOMS)[0],
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  zoom: number
) {
  const desks = room.type === "lounge" ? 0 : room.type === "utility" ? 0 : 3;
  for (let i = 0; i < desks; i++) {
    const dx = rx + 16 + (i % 3) * (rw / 3.5);
    const dy = ry + rh * 0.45 + Math.floor(i / 3) * 24;
    ctx.fillStyle = VO.wood;
    ctx.fillRect(dx, dy, 28 * zoom, 6 * zoom);
    ctx.fillStyle = "#0E141C";
    ctx.fillRect(dx + 4, dy - 14 * zoom, 20 * zoom, 12 * zoom);
    ctx.fillStyle = "#1A2030";
    ctx.fillRect(dx + 6, dy - 12 * zoom, 8 * zoom, 8 * zoom);
    ctx.fillRect(dx + 16, dy - 12 * zoom, 6 * zoom, 8 * zoom);
    ctx.fillStyle = "#2A3344";
    ctx.beginPath();
    ctx.ellipse(dx + 14, dy + 10 * zoom, 8 * zoom, 4 * zoom, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (room.type === "lounge") {
    ctx.fillStyle = "#3A4254";
    ctx.fillRect(rx + 20, ry + rh * 0.5, rw * 0.5, 12 * zoom);
    ctx.fillStyle = VO.success;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(rx + rw - 20, ry + 20, 6 * zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (room.id === "server") {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "#0A1018";
      ctx.fillRect(rx + 12 + i * 18, ry + 20, 14 * zoom, 40 * zoom);
      ctx.fillStyle = VO.accent;
      ctx.fillRect(rx + 14 + i * 18, ry + 26, 10 * zoom, 2 * zoom);
    }
  }
}

function drawProfessional(
  ctx: CanvasRenderingContext2D,
  sim: SimAgent,
  ox: number,
  oy: number,
  zoom: number
) {
  const v = getVisual(sim.slug);
  const p = project(sim.x, sim.y, ox, oy, zoom);
  const bob = sim.pose === "walk" ? Math.sin(sim.phase * 6) * 1.5 * zoom : 0;
  const h = v.height * (sim.pose === "sit" ? 0.88 : 1);

  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.scale(sim.facing * h, h);

  ctx.fillStyle = VO.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 6 * zoom, 7 * zoom, 2.5 * zoom, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1A2030";
  ctx.fillRect(-4 * zoom, 0, 8 * zoom, sim.pose === "sit" ? 8 * zoom : 14 * zoom);

  const suitG = ctx.createLinearGradient(0, -18 * zoom, 0, 0);
  suitG.addColorStop(0, v.suit);
  suitG.addColorStop(1, v.suit);
  ctx.fillStyle = suitG;
  ctx.beginPath();
  ctx.moveTo(-6 * zoom, 0);
  ctx.lineTo(-5 * zoom, -20 * zoom);
  ctx.lineTo(5 * zoom, -20 * zoom);
  ctx.lineTo(6 * zoom, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = v.shirt;
  ctx.fillRect(-2 * zoom, -16 * zoom, 4 * zoom, 8 * zoom);

  const skinG = ctx.createRadialGradient(0, -24 * zoom, 1, 0, -24 * zoom, 5 * zoom);
  skinG.addColorStop(0, v.skin);
  skinG.addColorStop(1, v.skin);
  ctx.fillStyle = skinG;
  ctx.beginPath();
  ctx.arc(0, -24 * zoom, 4.5 * zoom, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = v.hair;
  ctx.fillRect(-5 * zoom, -29 * zoom, 10 * zoom, 5 * zoom);

  if (sim.pose === "type") {
    ctx.fillStyle = "#64748B";
    ctx.fillRect(5 * zoom, -12 * zoom, 6 * zoom, 4 * zoom);
  }

  ctx.restore();
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  sims: Map<string, SimAgent>,
  cam: { x: number; y: number; zoom: number }
): BubbleHit[] {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, VO.bg);
  bg.addColorStop(1, "#080E16");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const ox = width / 2 + cam.x;
  const oy = 60 + cam.y;
  const zoom = cam.zoom;

  for (const room of ROOMS) drawRoom(ctx, room, ox, oy, zoom);

  const sorted = [...sims.values()].sort((a, b) => a.y + a.x - (b.y + b.x));
  const hits: BubbleHit[] = [];

  for (const sim of sorted) {
    drawProfessional(ctx, sim, ox, oy, zoom);
    const p = project(sim.x, sim.y, ox, oy, zoom);
    hits.push({
      slug: sim.slug,
      name: sim.name,
      text: sim.bubble,
      sx: p.x,
      sy: p.y - 38 * zoom,
    });
  }

  return hits;
}

export function hitTestAgent(
  sims: Map<string, SimAgent>,
  mx: number,
  my: number,
  cam: { x: number; y: number; zoom: number },
  canvasW: number
): string | null {
  const ox = canvasW / 2 + cam.x;
  const oy = 60 + cam.y;
  let best: { slug: string; d: number } | null = null;

  for (const sim of sims.values()) {
    const p = project(sim.x, sim.y, ox, oy, cam.zoom);
    const d = Math.hypot(mx - p.x, my - p.y);
    if (d < 20 * cam.zoom && (!best || d < best.d)) best = { slug: sim.slug, d };
  }
  return best?.slug ?? null;
}
