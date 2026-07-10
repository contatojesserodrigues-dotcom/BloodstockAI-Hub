// ============================================================
// BloodstockAI® — Breeze-Up Frame Annotation Engine v6
// Deterministic horse-locked overlay:
//  1) Detect the horse bounding box from pixel contrast (no AI guesswork)
//  2) Fit an anatomically-proportioned skeleton inside that box
//  3) Draw fore/hind extension triangles + stride triangle + topline
//  4) Phase-aware leg geometry (suspension, push-off, collection, etc.)
// ============================================================

// ── colour palette ──
const GOLD       = "rgb(255, 205, 50)";
const GOLD_SOFT  = "rgba(255, 205, 50, 0.18)";
const GOLD_FILL  = "rgba(255, 205, 50, 0.12)";
const WHITE      = "rgb(255, 255, 255)";
const SHADOW     = "rgba(0,0,0,0.85)";
const BG_DARK    = "rgba(0,0,0,0.78)";
const GREEN      = "rgb(80, 200, 80)";

interface Pt { x: number; y: number }

interface Box { x: number; y: number; w: number; h: number }

interface Skeleton {
  // topline
  poll: Pt; withers: Pt; back: Pt; croup: Pt; tail: Pt;
  // body axis
  shoulder: Pt; chest: Pt; belly: Pt; hip: Pt;
  // foreleg (lead/extending)
  foreElbow: Pt; foreKnee: Pt; foreFetlock: Pt; foreHoof: Pt;
  // hindleg (driving)
  stifle: Pt; hock: Pt; hindFetlock: Pt; hindHoof: Pt;
  // facing left or right
  facing: "left" | "right";
}

export interface FrameMetrics {
  shoulder?: number; elbow?: number; hip?: number; hock?: number;
  frontReach?: number; rearDrive?: number; topline?: number;
  triangleA?: number; triangleB?: number; triangleC?: number; triangleSum?: number;
  stridePx?: number; strideM?: number;
  scaleMPerPx?: number; calibrationMethod?: "horse_height" | "estimated";
  balanceFront?: number;     // % of body length sitting in front of withers vertical
  balanceRear?: number;      // % of body length sitting behind withers vertical
  balanceLabel?: string;     // "Front-loaded" | "Balanced" | "Rear-driven"
  bodyAxisDeg?: number;      // angle of the spine vs horizontal
  // ── new extension metrics ──
  spanPx?: number;            // |front_hoof_x - rear_hoof_x|
  spanM?: number;             // span in metres
  extensionRatio?: number;    // (spanPx / bodyPx) * 100
  extensionQuality?: string;  // Excellent / Good / Moderate / Restricted
  // ── calibration lock state ──
  scaleLocked?: boolean;
  calibrationNote?: string;   // e.g. "scale held — variance > 5%"
}

export interface FrameAnnotation {
  frameIndex: number;
  label: string;
  annotatedDataUrl: string;
  confidence: number;
  detected: boolean;
  metrics?: FrameMetrics;
  imageWidth?: number;
  imageHeight?: number;
  // Backwards-compat fields used by breezeBiomechanics.ts
  keypoints?: {
    poll?: Pt; withers?: Pt; back?: Pt; loin?: Pt; croup?: Pt;
    shoulder?: Pt; elbow?: Pt; foreKnee?: Pt; foreFetlock?: Pt; foreHoof?: Pt;
    hip?: Pt; stifle?: Pt; hock?: Pt; hindCannon?: Pt; hindFetlock?: Pt; hindHoof?: Pt;
    muzzle?: Pt; chest?: Pt; belly?: Pt;
  };
  railPostsX?: number[];
  horseHeightWithers?: Pt;
}

const PHASE_LABELS: Record<number, string> = {
  0: "Initial Stride",
  1: "Lead Leg Extension",
  2: "Peak Extension",
  3: "Suspension",
  4: "Landing Impact",
  5: "Full Extension",
  6: "Push-Off Drive",
  7: "Collection",
};

// ── Phase geometry presets (radians of leg swing relative to vertical) ──
// Positive = forward swing for the FACING direction; negative = backward.
interface PhaseGeo {
  foreSwingDeg: number;   // angle of the foreleg from vertical (forward)
  hindSwingDeg: number;   // angle of the hindleg from vertical (backward)
  foreFlexDeg: number;    // knee flexion (0 = straight, 90 = fully tucked)
  hindFlexDeg: number;    // hock flexion
  groundFraction: number; // how close hooves are to the ground (1.0 = touching)
  toplineTiltDeg: number; // tail-down or tail-up tilt
}

const PHASES: Record<number, PhaseGeo> = {
  // Initial Stride – legs gathered, fore reaching, hind planted
  0: { foreSwingDeg: 25, hindSwingDeg: -10, foreFlexDeg: 35, hindFlexDeg: 15, groundFraction: 1.0, toplineTiltDeg: 2 },
  // Lead Leg Extension – fore at full reach, hind starts to drive
  1: { foreSwingDeg: 45, hindSwingDeg: -25, foreFlexDeg: 12, hindFlexDeg: 25, groundFraction: 0.92, toplineTiltDeg: 3 },
  // Peak Extension – maximum opening
  2: { foreSwingDeg: 55, hindSwingDeg: -40, foreFlexDeg: 8,  hindFlexDeg: 30, groundFraction: 0.85, toplineTiltDeg: 4 },
  // Suspension – airborne, all legs flexed
  3: { foreSwingDeg: 35, hindSwingDeg: -10, foreFlexDeg: 55, hindFlexDeg: 60, groundFraction: 0.55, toplineTiltDeg: 0 },
  // Landing Impact – fore plants, hind still folded
  4: { foreSwingDeg: 20, hindSwingDeg: 5,   foreFlexDeg: 18, hindFlexDeg: 50, groundFraction: 1.0, toplineTiltDeg: -1 },
  // Full Extension – both legs maximally apart
  5: { foreSwingDeg: 50, hindSwingDeg: -50, foreFlexDeg: 10, hindFlexDeg: 12, groundFraction: 0.95, toplineTiltDeg: 5 },
  // Push-Off Drive – hind explodes back, fore lifting
  6: { foreSwingDeg: 30, hindSwingDeg: -55, foreFlexDeg: 40, hindFlexDeg: 8, groundFraction: 0.9, toplineTiltDeg: 6 },
  // Collection – legs gathering under body
  7: { foreSwingDeg: 15, hindSwingDeg: -15, foreFlexDeg: 45, hindFlexDeg: 45, groundFraction: 0.85, toplineTiltDeg: 1 },
};

// ── geometry helpers ──
function angleAtJoint(p: Pt, j: Pt, d: Pt): number {
  const v1x = p.x - j.x, v1y = p.y - j.y;
  const v2x = d.x - j.x, v2y = d.y - j.y;
  const dot = v1x * v2x + v1y * v2y;
  const m1 = Math.hypot(v1x, v1y), m2 = Math.hypot(v2x, v2y);
  if (!m1 || !m2) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}
function angleFromVertical(top: Pt, bottom: Pt): number {
  const dx = bottom.x - top.x;
  const dy = bottom.y - top.y;
  return (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI;
}
function angleFromHorizontal(a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
}

// ────────────────────────────────────────────────────────────
// 1) HORSE BOUNDING-BOX DETECTION (deterministic, no AI)
// ────────────────────────────────────────────────────────────
// We scan the image for a connected dark region (horse silhouette against
// the bright turf/rail background). This is robust for breeze-up footage
// where horses are dark bay/brown on green grass.
function detectHorseBox(ctx: CanvasRenderingContext2D, w: number, h: number): { box: Box; facing: "left" | "right" } {
  // Downsample to keep this fast
  const sample = 220;
  const sx = sample;
  const sy = Math.round((h / w) * sample);
  const tmp = document.createElement("canvas");
  tmp.width = sx; tmp.height = sy;
  const tctx = tmp.getContext("2d");
  if (!tctx) return { box: defaultBox(w, h), facing: "left" };
  tctx.drawImage(ctx.canvas, 0, 0, sx, sy);
  let imgData: ImageData;
  try {
    imgData = tctx.getImageData(0, 0, sx, sy);
  } catch {
    return { box: defaultBox(w, h), facing: "left" };
  }
  const data = imgData.data;

  // Per-row "darkness" histogram in the middle band of the image
  // (skip top 12% sky/grandstand and bottom ~18% caption/branding bar
  //  so the dark Arqana/Bloodstock strip is not mistaken for the horse)
  const yStart = Math.floor(sy * 0.12);
  const yEnd   = Math.floor(sy * 0.82);
  const xStart = Math.floor(sx * 0.05);
  const xEnd   = Math.floor(sx * 0.95);

  // Compute average brightness in the band first
  let totalLum = 0, totalCount = 0;
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x += 2) {
      const i = (y * sx + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      totalLum += lum; totalCount++;
    }
  }
  const avg = totalCount > 0 ? totalLum / totalCount : 110;
  // Anything notably darker than average AND not deeply green is horse-candidate
  const darkThresh = avg * 0.72;

  // Build a binary mask
  const mask = new Uint8Array(sx * sy);
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const i = (y * sx + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Reject pure green grass (g much greater than r and b)
      const isGrass = g > r + 20 && g > b + 25;
      // Reject white rail (very bright)
      const isRail = lum > avg * 1.4;
      if (lum < darkThresh && !isGrass && !isRail) mask[y * sx + x] = 1;
    }
  }

  // Find largest connected component (BFS) — this is the horse
  const visited = new Uint8Array(sx * sy);
  let bestBox = { x0: 0, y0: 0, x1: 0, y1: 0, count: 0 };
  const stack: number[] = [];
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const idx = y * sx + x;
      if (!mask[idx] || visited[idx]) continue;
      // BFS
      stack.length = 0;
      stack.push(idx);
      let x0 = x, y0 = y, x1 = x, y1 = y, count = 0;
      while (stack.length) {
        const cur = stack.pop()!;
        if (visited[cur]) continue;
        visited[cur] = 1;
        const cy = Math.floor(cur / sx), cx = cur - cy * sx;
        if (!mask[cur]) continue;
        count++;
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx;
        if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
        if (cx > 0)        stack.push(cur - 1);
        if (cx < sx - 1)   stack.push(cur + 1);
        if (cy > 0)        stack.push(cur - sx);
        if (cy < sy - 1)   stack.push(cur + sx);
      }
      if (count > bestBox.count) bestBox = { x0, y0, x1, y1, count };
    }
  }

  // Need a meaningful blob — at least 0.4% of frame
  const minCount = (sx * sy) * 0.004;
  if (bestBox.count < minCount) {
    return { box: defaultBox(w, h), facing: "left" };
  }

  // Map back to full-resolution coordinates with a small inset/expand
  const scaleX = w / sx, scaleY = h / sy;
  let bx = bestBox.x0 * scaleX;
  let by = bestBox.y0 * scaleY;
  let bw = (bestBox.x1 - bestBox.x0 + 1) * scaleX;
  let bh = (bestBox.y1 - bestBox.y0 + 1) * scaleY;

  // Sanity clamp — horses occupy a substantial vertical band of the frame.
  // Reject thin/flat blobs (caption bars, shadows, rails).
  const aspect = bw / Math.max(1, bh);
  if (
    bw < w * 0.10 || bw > w * 0.90 ||
    bh < h * 0.22 || bh > h * 0.85 ||
    aspect > 3.2 // a horse silhouette is rarely wider than ~3× its height
  ) {
    return { box: defaultBox(w, h), facing: "left" };
  }

  // Expand box slightly to include legs and head margin
  const padX = bw * 0.05, padY = bh * 0.08;
  bx = Math.max(0, bx - padX); by = Math.max(0, by - padY);
  bw = Math.min(w - bx, bw + padX * 2);
  bh = Math.min(h - by, bh + padY * 2);

  // Determine facing: which half of the box has the most "head-like"
  // (taller, narrower) silhouette? We use vertical extent in the upper third.
  // Simpler proxy: the side with the highest dark pixel column = head side.
  const upperThird = Math.floor((bestBox.y1 - bestBox.y0) / 3);
  let leftMass = 0, rightMass = 0;
  const midX = Math.floor((bestBox.x0 + bestBox.x1) / 2);
  for (let y = bestBox.y0; y < bestBox.y0 + upperThird; y++) {
    for (let x = bestBox.x0; x <= bestBox.x1; x++) {
      if (mask[y * sx + x]) (x < midX ? leftMass++ : rightMass++);
    }
  }
  const facing: "left" | "right" = leftMass >= rightMass ? "left" : "right";

  return { box: { x: bx, y: by, w: bw, h: bh }, facing };
}

function defaultBox(w: number, h: number): Box {
  // Centred fallback sized like a real horse silhouette
  // (~38% of frame width, ~38% of frame height, vertically centred so
  //  the skeleton + triangle land on the body, not on the captions).
  return { x: w * 0.31, y: h * 0.32, w: w * 0.38, h: h * 0.42 };
}

// ────────────────────────────────────────────────────────────
// 2) FIT AN ANATOMICAL SKELETON INSIDE THE BOX
// ────────────────────────────────────────────────────────────
// The skeleton is built relative to the box, then mirrored if the horse is
// facing right. All joint positions are normalised inside the bounding box
// so the overlay stays perfectly locked to the silhouette.
function buildSkeleton(box: Box, facing: "left" | "right", phase: PhaseGeo): Skeleton {
  // Box-relative coordinates: 0=left/top, 1=right/bottom
  // We fix anatomical landmarks inside the body capsule first.
  const W = box.w, H = box.h;
  const x0 = box.x, y0 = box.y;

  // Body capsule (the trunk — head/legs hang off it)
  // Trunk runs from ~0.20 to ~0.78 of box width, vertically ~0.30–0.55
  const trunkTopY  = y0 + H * 0.35;
  const trunkBotY  = y0 + H * 0.55;

  // Topline points (head end → tail end) when facing LEFT.
  // Anatomy reference for a galloping TB:
  //   • poll sits FORWARD of the withers, only slightly above it
  //     (extended neck during gallop) — NOT high in the upper-left of the box
  //   • the back is essentially flat between withers and croup
  //   • the tail streams back from the croup at near body-axis level
  const withersX  = x0 + W * 0.32;
  const withersY  = trunkTopY;
  const croupX    = x0 + W * 0.78;
  const croupY    = trunkTopY + H * 0.015;
  // Neck: poll forward of withers and ~5% above (extended at gallop)
  const headX     = withersX - W * 0.22;
  const polleY    = withersY - H * 0.06;
  const backX     = (withersX + croupX) / 2;
  const backY     = (withersY + croupY) / 2 + H * 0.004 * phase.toplineTiltDeg;
  // Tail: streams back from croup at roughly body-axis level (gallop)
  const tailX     = croupX + W * 0.16;
  const tailY     = croupY + H * 0.02;

  // Body underline anchors
  const shoulderX = withersX + W * 0.02;
  const shoulderY = trunkTopY + (trunkBotY - trunkTopY) * 0.55;
  const chestX    = x0 + W * 0.30;
  const chestY    = trunkBotY;
  const bellyX    = x0 + W * 0.55;
  const bellyY    = trunkBotY + H * 0.02;
  const hipX      = croupX - W * 0.02;
  const hipY      = trunkTopY + (trunkBotY - trunkTopY) * 0.55;

  // Ground line (where hooves should be)
  const groundY   = y0 + H * (0.97 * phase.groundFraction);

  // Fore leg geometry (lead leg is the one extending forward)
  // Upper leg length from shoulder to elbow ≈ 0.18H
  const upperFore = H * 0.20;
  const lowerFore = H * 0.30; // elbow to hoof
  // Apply forward swing of the foreleg from vertical
  const swingF = (phase.foreSwingDeg * Math.PI) / 180;
  // Elbow hangs straight down from shoulder
  const elbowX = shoulderX;
  const elbowY = shoulderY + upperFore;
  // Knee deflects forward by foreSwingDeg around elbow
  const kneeX = elbowX - Math.sin(swingF) * lowerFore * 0.45;
  const kneeY = elbowY + Math.cos(swingF) * lowerFore * 0.45;
  // Apply knee flex (cannon kicks forward more)
  const flexF = (phase.foreFlexDeg * Math.PI) / 180;
  const fetlockX = kneeX - Math.sin(swingF + flexF * 0.3) * lowerFore * 0.35;
  const fetlockY = kneeY + Math.cos(swingF + flexF * 0.3) * lowerFore * 0.35;
  let foreHoofX = fetlockX - Math.sin(swingF + flexF * 0.5) * lowerFore * 0.25;
  let foreHoofY = fetlockY + Math.cos(swingF + flexF * 0.5) * lowerFore * 0.25;
  // Snap hoof to ground line if phase has it grounded
  if (phase.groundFraction >= 0.9) foreHoofY = groundY;

  // Hind leg geometry
  const upperHind = H * 0.22;
  const lowerHind = H * 0.32;
  const swingH = (phase.hindSwingDeg * Math.PI) / 180;
  const stifleX = hipX;
  const stifleY = hipY + upperHind;
  const hockX = stifleX - Math.sin(swingH) * lowerHind * 0.45;
  const hockY = stifleY + Math.cos(swingH) * lowerHind * 0.45;
  const flexH = (phase.hindFlexDeg * Math.PI) / 180;
  const hindFetlockX = hockX - Math.sin(swingH + flexH * 0.3) * lowerHind * 0.4;
  const hindFetlockY = hockY + Math.cos(swingH + flexH * 0.3) * lowerHind * 0.4;
  let hindHoofX = hindFetlockX - Math.sin(swingH + flexH * 0.5) * lowerHind * 0.3;
  let hindHoofY = hindFetlockY + Math.cos(swingH + flexH * 0.5) * lowerHind * 0.3;
  if (phase.groundFraction >= 0.9) hindHoofY = groundY;

  let s: Skeleton = {
    poll:        { x: headX,     y: polleY },
    withers:     { x: withersX,  y: withersY },
    back:        { x: backX,     y: backY },
    croup:       { x: croupX,    y: croupY },
    tail:        { x: tailX,     y: tailY },
    shoulder:    { x: shoulderX, y: shoulderY },
    chest:       { x: chestX,    y: chestY },
    belly:       { x: bellyX,    y: bellyY },
    hip:         { x: hipX,      y: hipY },
    foreElbow:   { x: elbowX,    y: elbowY },
    foreKnee:    { x: kneeX,     y: kneeY },
    foreFetlock: { x: fetlockX,  y: fetlockY },
    foreHoof:    { x: foreHoofX, y: foreHoofY },
    stifle:      { x: stifleX,   y: stifleY },
    hock:        { x: hockX,     y: hockY },
    hindFetlock: { x: hindFetlockX, y: hindFetlockY },
    hindHoof:    { x: hindHoofX, y: hindHoofY },
    facing,
  };

  // Mirror horizontally if the horse faces right
  if (facing === "right") {
    const cx = box.x + box.w / 2;
    const m = (p: Pt) => ({ x: 2 * cx - p.x, y: p.y });
    s = {
      poll: m(s.poll), withers: m(s.withers), back: m(s.back), croup: m(s.croup), tail: m(s.tail),
      shoulder: m(s.shoulder), chest: m(s.chest), belly: m(s.belly), hip: m(s.hip),
      foreElbow: m(s.foreElbow), foreKnee: m(s.foreKnee), foreFetlock: m(s.foreFetlock), foreHoof: m(s.foreHoof),
      stifle: m(s.stifle), hock: m(s.hock), hindFetlock: m(s.hindFetlock), hindHoof: m(s.hindHoof),
      facing,
    };
  }

  return s;
}

// ────────────────────────────────────────────────────────────
// 3) DRAWING
// ────────────────────────────────────────────────────────────
function strokeLine(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, color: string, width: number, dashed = false) {
  ctx.save();
  ctx.lineCap = "round";
  if (dashed) ctx.setLineDash([8, 5]);
  ctx.strokeStyle = SHADOW; ctx.lineWidth = width + 2;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.restore();
}
function jointDot(ctx: CanvasRenderingContext2D, p: Pt, r = 5) {
  ctx.fillStyle = SHADOW;
  ctx.beginPath(); ctx.arc(p.x, p.y, r + 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, r - 3), 0, Math.PI * 2); ctx.fill();
}
function labelBox(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string = GOLD, align: CanvasTextAlign = "left") {
  ctx.font = "bold 11px Helvetica, Arial, sans-serif";
  ctx.textAlign = align;
  const m = ctx.measureText(text);
  const pad = 5, h = 16;
  const bx = align === "right" ? x - m.width - pad : align === "center" ? x - m.width / 2 - pad : x - pad;
  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.fillRect(bx, y - 12, m.width + pad * 2, h);
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.strokeRect(bx, y - 12, m.width + pad * 2, h);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}

function fillTriangle(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, c: Pt, fill: string, stroke: string, dashed = false) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath();
  ctx.fill();
  ctx.restore();
  strokeLine(ctx, a, b, stroke, 2, dashed);
  strokeLine(ctx, b, c, stroke, 2, dashed);
  strokeLine(ctx, c, a, stroke, 2, dashed);
}

function drawSkeleton(ctx: CanvasRenderingContext2D, s: Skeleton) {
  // Topline
  strokeLine(ctx, s.poll, s.withers, GOLD, 3);
  strokeLine(ctx, s.withers, s.back, GOLD, 3);
  strokeLine(ctx, s.back, s.croup, GOLD, 3);
  strokeLine(ctx, s.croup, s.tail, GOLD, 2, true);
  // Body axis (shoulder ↔ hip) — biomechanical reference
  strokeLine(ctx, s.shoulder, s.hip, GOLD, 1.5, true);
  // Foreleg chain
  strokeLine(ctx, s.shoulder, s.foreElbow, GOLD, 3);
  strokeLine(ctx, s.foreElbow, s.foreKnee, GOLD, 3);
  strokeLine(ctx, s.foreKnee, s.foreFetlock, GOLD, 3);
  strokeLine(ctx, s.foreFetlock, s.foreHoof, GOLD, 3);
  // Hindleg chain
  strokeLine(ctx, s.hip, s.stifle, GOLD, 3);
  strokeLine(ctx, s.stifle, s.hock, GOLD, 3);
  strokeLine(ctx, s.hock, s.hindFetlock, GOLD, 3);
  strokeLine(ctx, s.hindFetlock, s.hindHoof, GOLD, 3);
  // Joint dots
  [s.poll, s.withers, s.back, s.croup, s.shoulder, s.hip,
   s.foreElbow, s.foreKnee, s.foreFetlock, s.foreHoof,
   s.stifle, s.hock, s.hindFetlock, s.hindHoof].forEach(p => jointDot(ctx, p, 4));
}

function computeMetrics(s: Skeleton, box: Box): FrameMetrics {
  const m: FrameMetrics = {};
  m.shoulder   = angleAtJoint(s.withers, s.shoulder, s.foreElbow);
  m.elbow      = angleAtJoint(s.shoulder, s.foreElbow, s.foreKnee);
  m.hip        = angleAtJoint(s.croup, s.hip, s.stifle);
  m.hock       = angleAtJoint(s.stifle, s.hock, s.hindFetlock);
  m.frontReach = angleFromVertical(s.shoulder, s.foreHoof);
  m.rearDrive  = angleFromVertical(s.hip, s.hindHoof);
  m.topline    = angleFromHorizontal(s.croup, s.withers);
  // Extension triangle: mid-trunk (apex) — fore_hoof — hind_hoof.
  // Keep in sync with drawExtensionTriangles() so the headline angle
  // matches the rendered triangle exactly.
  const apex: Pt = {
    x: (s.shoulder.x + s.hip.x) / 2,
    y: (s.chest.y + s.belly.y) / 2 - 6,
  };
  m.triangleA  = angleAtJoint(s.foreHoof, apex,        s.hindHoof); // apex angle
  m.triangleB  = angleAtJoint(apex,       s.foreHoof,  s.hindHoof);
  m.triangleC  = angleAtJoint(apex,       s.hindHoof,  s.foreHoof);
  m.triangleSum = m.triangleA + m.triangleB + m.triangleC;
  m.stridePx   = Math.abs(s.foreHoof.x - s.hindHoof.x);
  // ── Calibration with session lock (prevents per-frame scale drift) ──
  const heightPx = Math.abs(s.withers.y - Math.max(s.foreHoof.y, s.hindHoof.y));
  const rawScale = heightPx > 20 ? (1.62 / heightPx) : (1.62 / (box.h * 0.6));
  const rawMethod: "horse_height" | "estimated" = heightPx > 20 ? "horse_height" : "estimated";
  const sessionScale = getSessionScale(rawScale, heightPx, rawMethod);
  m.scaleMPerPx = sessionScale.scale;
  m.calibrationMethod = sessionScale.method;
  m.scaleLocked = sessionScale.locked;
  m.calibrationNote = sessionScale.note;
  m.strideM = m.stridePx * m.scaleMPerPx;

  // ── Extension span + extension ratio (priority metric) ──
  m.spanPx = Math.abs(s.foreHoof.x - s.hindHoof.x);
  m.spanM = m.spanPx * m.scaleMPerPx;
  const bodyPx = Math.abs(s.croup.x - s.shoulder.x) || 1;
  let ratio = (m.spanPx / bodyPx) * 100;
  // Validation: extension_ratio must sit within 20–150%; clamp otherwise
  if (!isFinite(ratio)) ratio = 0;
  if (ratio < 20) ratio = 20;
  if (ratio > 150) ratio = 150;
  m.extensionRatio = Math.round(ratio);
  m.extensionQuality =
    ratio >= 85 ? "Excellent" :
    ratio >= 65 ? "Good" :
    ratio >= 45 ? "Moderate" : "Restricted ⚠";

  // Spine / balance axis: use withers → croup (true thoracolumbar axis).
  // poll → tail is unreliable because head bob and tail carriage are
  // independent of the actual spine inclination.
  m.bodyAxisDeg = angleFromHorizontal(s.withers, s.croup);
  // ── Dynamic gait balance (per-frame, hoof + body-mid based) ──
  const balance = computeGaitBalance(s);
  m.balanceFront = balance.front;
  m.balanceRear  = balance.rear;
  m.balanceLabel = balance.label;
  return m;
}

// ────────────────────────────────────────────────────────────
// Session-scale lock: compute once per video, hold across frames
// ────────────────────────────────────────────────────────────
let SESSION_SCALE: { scale: number; method: "horse_height" | "estimated"; baselineHeightPx: number } | null = null;

export function resetSessionScale() {
  SESSION_SCALE = null;
}

function getSessionScale(
  rawScale: number,
  heightPx: number,
  method: "horse_height" | "estimated",
): { scale: number; method: "horse_height" | "estimated"; locked: boolean; note?: string } {
  if (!SESSION_SCALE) {
    SESSION_SCALE = { scale: rawScale, method, baselineHeightPx: heightPx };
    return { scale: rawScale, method, locked: true };
  }
  // Detect significant camera change (>30% change in apparent horse size) → recalibrate
  if (heightPx > 20 && SESSION_SCALE.baselineHeightPx > 20) {
    const sizeDelta = Math.abs(heightPx - SESSION_SCALE.baselineHeightPx) / SESSION_SCALE.baselineHeightPx;
    if (sizeDelta > 0.30) {
      SESSION_SCALE = { scale: rawScale, method, baselineHeightPx: heightPx };
      return { scale: rawScale, method, locked: true, note: "recalibrated — camera moved" };
    }
  }
  // Variance check vs current frame raw — if >5% drift, hold previous scale
  const variance = Math.abs(rawScale - SESSION_SCALE.scale) / SESSION_SCALE.scale;
  if (variance > 0.05) {
    return { scale: SESSION_SCALE.scale, method: SESSION_SCALE.method, locked: true, note: "scale held — variance > 5%" };
  }
  return { scale: SESSION_SCALE.scale, method: SESSION_SCALE.method, locked: true };
}

// ────────────────────────────────────────────────────────────
// Per-frame gait balance (hoof support base vs body-mid centre)
// ────────────────────────────────────────────────────────────
function computeGaitBalance(s: Skeleton): { front: number; rear: number; label: string } {
  const front_hoof_x = s.foreHoof.x;
  const rear_hoof_x = s.hindHoof.x;
  const body_mid_x = (s.shoulder.x + s.hip.x) / 2;
  const total_span = Math.abs(front_hoof_x - rear_hoof_x);
  if (total_span < 1) return { front: 50, rear: 50, label: "Balanced" };

  let rear_pct: number;
  if (front_hoof_x > rear_hoof_x) {
    // moving right → left
    rear_pct = ((front_hoof_x - body_mid_x) / total_span) * 100;
  } else {
    // moving left → right
    rear_pct = ((body_mid_x - rear_hoof_x) / total_span) * 100;
  }
  let front_pct = 100 - rear_pct;
  // Clamp 20–80
  rear_pct = Math.round(Math.max(20, Math.min(80, rear_pct)));
  front_pct = 100 - rear_pct;

  let label = "Balanced";
  if (rear_pct >= 60) label = "Rear-driven";
  else if (front_pct >= 60) label = "Front-driven";
  else if (front_pct >= 45 && front_pct <= 55) label = "Balanced";
  return { front: front_pct, rear: rear_pct, label };
}

function drawExtensionTriangles(ctx: CanvasRenderingContext2D, s: Skeleton) {
  // ───── Single "Secretariat-style" extension triangle ─────
  // Apex sits ON the horse's body (mid-trunk between shoulder and hip),
  // so the triangle visibly wraps the silhouette instead of floating
  // below it. Base spans from the extended fore hoof to the hind hoof.
  const apex: Pt = {
    x: (s.shoulder.x + s.hip.x) / 2,
    y: (s.chest.y + s.belly.y) / 2 - 6,
  };
  const a = s.foreHoof;
  const b = s.hindHoof;

  // Filled triangle (subtle gold)
  fillTriangle(ctx, apex, a, b, GOLD_SOFT, GOLD, false);

  // Thicker emphasis legs from apex to each hoof (matches reference)
  strokeLine(ctx, apex, a, GOLD, 4);
  strokeLine(ctx, apex, b, GOLD, 4);

  // Apex angle = angle at the belly between the two legs
  const apexDeg = angleAtJoint(a, apex, b);

  // Big centred apex-angle label
  drawApexAngle(ctx, apex, apexDeg);
}

function drawApexAngle(ctx: CanvasRenderingContext2D, apex: Pt, deg: number) {
  const text = `${Math.round(deg)}°`;
  ctx.save();
  ctx.font = "bold 38px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Shadow for legibility on any background
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.strokeText(text, apex.x, apex.y + 4);
  ctx.fillStyle = GOLD;
  ctx.fillText(text, apex.x, apex.y + 4);
  ctx.restore();
}

// ───── Extra anatomical reference lines (drawn on every frame) ─────
function drawBalanceLines(
  ctx: CanvasRenderingContext2D,
  s: Skeleton,
  m: FrameMetrics,
  groundY: number,
  w: number,
) {
  // 1) Spine / balance axis: poll → tail (long dashed cyan-gold)
  ctx.save();
  ctx.setLineDash([10, 6]);
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(s.poll.x, s.poll.y); ctx.lineTo(s.tail.x, s.tail.y); ctx.stroke();
  ctx.strokeStyle = "rgba(120, 220, 255, 0.95)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(s.poll.x, s.poll.y); ctx.lineTo(s.tail.x, s.tail.y); ctx.stroke();
  ctx.restore();

  // 2) Vertical "center-of-mass" plumb line through the withers
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(s.withers.x, s.withers.y - 8); ctx.lineTo(s.withers.x, groundY); ctx.stroke();
  ctx.restore();

  // 3) Horizontal ground-reference at hooves (already drawn green elsewhere)

  // 4) Inline labels for joint angles (ombro / quadril / jarrete)
  smallAngleLabel(ctx, s.shoulder.x + 6, s.shoulder.y - 6, `Sh ${m.shoulder?.toFixed(0)}°`);
  smallAngleLabel(ctx, s.hip.x - 6,      s.hip.y - 6,      `Hip ${m.hip?.toFixed(0)}°`, "right");
  smallAngleLabel(ctx, s.hock.x - 6,     s.hock.y + 14,    `Hock ${m.hock?.toFixed(0)}°`, "right");
  smallAngleLabel(ctx, s.foreKnee.x + 6, s.foreKnee.y + 14, `Knee ${m.elbow?.toFixed(0)}°`);

  // 5) Spine tilt label centred on the back
  smallAngleLabel(
    ctx,
    (s.withers.x + s.croup.x) / 2,
    Math.min(s.withers.y, s.croup.y) - 12,
    `Spine ${m.bodyAxisDeg?.toFixed(0)}°`,
    "center",
  );

  // 6) Balance bar across the top of the frame
  drawBalanceBar(ctx, w, m);
}

function smallAngleLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, text: string,
  align: CanvasTextAlign = "left",
) {
  ctx.save();
  ctx.font = "bold 10px Helvetica, Arial, sans-serif";
  ctx.textAlign = align;
  const w = ctx.measureText(text).width;
  const pad = 3, h = 13;
  const bx = align === "right" ? x - w - pad : align === "center" ? x - w / 2 - pad : x - pad;
  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.fillRect(bx, y - 10, w + pad * 2, h);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 0.8;
  ctx.strokeRect(bx, y - 10, w + pad * 2, h);
  ctx.fillStyle = GOLD;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawBalanceBar(ctx: CanvasRenderingContext2D, w: number, m: FrameMetrics) {
  if (m.balanceFront == null || m.balanceRear == null) return;
  const barW = 220, barH = 10;
  const x = (w - barW) / 2;
  const y = 16;
  // background
  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.fillRect(x - 6, y - 4, barW + 12, barH + 22);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1;
  ctx.strokeRect(x - 6, y - 4, barW + 12, barH + 22);
  // segments
  const frontW = (m.balanceFront / 100) * barW;
  ctx.fillStyle = "rgba(120, 220, 255, 0.9)";
  ctx.fillRect(x, y, frontW, barH);
  ctx.fillStyle = "rgba(255, 205, 50, 0.9)";
  ctx.fillRect(x + frontW, y, barW - frontW, barH);
  // labels
  ctx.font = "bold 10px Helvetica, Arial, sans-serif";
  ctx.fillStyle = "rgba(120, 220, 255, 1)";
  ctx.textAlign = "left";
  ctx.fillText(`Front ${m.balanceFront}%`, x, y + barH + 11);
  ctx.fillStyle = GOLD;
  ctx.textAlign = "right";
  ctx.fillText(`Rear ${m.balanceRear}%  •  ${m.balanceLabel}`, x + barW, y + barH + 11);
  ctx.textAlign = "left";
}

function drawStrideTriangle(ctx: CanvasRenderingContext2D, s: Skeleton) {
  fillTriangle(
    ctx,
    s.foreHoof, s.hindHoof, s.withers,
    GOLD_SOFT, GOLD, true
  );
}

function drawHeader(ctx: CanvasRenderingContext2D, frameIndex: number, phase: string) {
  const isPeak = phase.toLowerCase().includes("peak");
  const headerW = 280;
  ctx.fillStyle = isPeak ? "rgba(255,205,50,0.18)" : BG_DARK;
  ctx.fillRect(8, 8, headerW, 32);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
  ctx.strokeRect(8, 8, headerW, 32);
  ctx.fillStyle = isPeak ? GOLD : WHITE;
  ctx.font = "bold 13px Helvetica, Arial, sans-serif";
  ctx.fillText(`Frame ${frameIndex + 1}: ${phase}`, 14, 28);
}

function drawInfoPanel(ctx: CanvasRenderingContext2D, frameIndex: number, phase: string, m: FrameMetrics) {
  const x = 20, y = 50, ww = 340, hh = 188;
  ctx.fillStyle = BG_DARK; ctx.fillRect(x, y, ww, hh);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2; ctx.strokeRect(x, y, ww, hh);
  ctx.fillStyle = GOLD; ctx.fillRect(x, y, ww, 3);

  ctx.font = "bold 11px Helvetica, Arial, sans-serif";
  let line = y + 18;
  const row = (txt: string, color: string) => { ctx.fillStyle = color; ctx.fillText(txt, x + 10, line); line += 16; };

  row("BloodstockAI® Biomechanics", GOLD);
  ctx.font = "11px Helvetica, Arial, sans-serif";
  row(`Frame ${frameIndex + 1}: ${phase}`, WHITE);
  {
    const lockTag = m.scaleLocked ? "[LOCKED]" : "";
    const note = m.calibrationNote ? ` • ${m.calibrationNote}` : "";
    row(`Cal: ${m.calibrationMethod ?? "—"} | scale=${m.scaleMPerPx ? m.scaleMPerPx.toFixed(4) : "—"} m/px ${lockTag}${note}`, "rgb(180,180,180)");
  }
  row(`Shoulder: ${m.shoulder?.toFixed(0) ?? "—"}°   |   Elbow: ${m.elbow?.toFixed(0) ?? "—"}°`, GOLD);
  row(`Hip: ${m.hip?.toFixed(0) ?? "—"}°   |   Hock: ${m.hock?.toFixed(0) ?? "—"}°`, GOLD);
  row(`Front Reach: ${m.frontReach?.toFixed(0) ?? "—"}°   |   Rear Drive: ${m.rearDrive?.toFixed(0) ?? "—"}°`, GOLD);
  row(`Topline: ${m.topline?.toFixed(0) ?? "—"}°   |   Span: ${m.spanM ? m.spanM.toFixed(2) + "m" : "—"}`, GOLD);
  row(`Extension: ${m.extensionRatio ?? "—"}% body  (${m.extensionQuality ?? "—"})`, GOLD);
  row(`Spine: ${m.bodyAxisDeg?.toFixed(0) ?? "—"}°   |   Balance: ${m.balanceFront ?? "—"}/${m.balanceRear ?? "—"}  (${m.balanceLabel ?? "—"})`, GOLD);
  if (m.triangleSum != null) {
    const ok = Math.abs(m.triangleSum - 180) < 1;
    row(`Triangle: ${m.triangleA!.toFixed(0)}°+${m.triangleB!.toFixed(0)}°+${m.triangleC!.toFixed(0)}° = ${m.triangleSum.toFixed(0)}° ${ok ? "✓" : "⚠"}`, ok ? GREEN : "rgb(220,80,80)");
  }
}

function drawBiomechPanel(ctx: CanvasRenderingContext2D, w: number, m: FrameMetrics) {
  const ww = 210, hh = 145;
  const x = w - ww - 12, y = 50;
  ctx.fillStyle = BG_DARK; ctx.fillRect(x, y, ww, hh);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2; ctx.strokeRect(x, y, ww, hh);
  ctx.fillStyle = GOLD; ctx.fillRect(x, y, ww, 3);

  ctx.font = "bold 11px Helvetica, Arial, sans-serif";
  ctx.fillStyle = GOLD; ctx.fillText("BIOMECHANICS", x + 10, y + 18);
  ctx.font = "11px Helvetica, Arial, sans-serif";
  ctx.fillStyle = WHITE;
  let line = y + 36;
  const row = (t: string) => { ctx.fillText(t, x + 10, line); line += 15; };
  row(`Shoulder:  ${m.shoulder?.toFixed(0) ?? "—"}°`);
  row(`Hip:       ${m.hip?.toFixed(0) ?? "—"}°`);
  row(`Hock:      ${m.hock?.toFixed(0) ?? "—"}°`);
  row(`Span:      ${m.spanM ? m.spanM.toFixed(2) + "m" : "—"}`);
  row(`Extension: ${m.extensionRatio ?? "—"}% body`);
  row(`Reach:     ${m.frontReach?.toFixed(0) ?? "—"}°`);
  row(`Drive:     ${m.rearDrive?.toFixed(0) ?? "—"}°`);
}

function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "rgba(255,205,50,0.5)";
  ctx.font = "bold 10px Helvetica, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("BloodstockAI®", w - 10, h - 10);
  ctx.textAlign = "left";
}

// ════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════
export async function annotateBreezFrames(frameDataUrls: string[]): Promise<FrameAnnotation[]> {
  const out: FrameAnnotation[] = [];
  // New session → reset scale lock so calibration is computed on first frame
  resetSessionScale();
  for (let i = 0; i < frameDataUrls.length; i++) {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error(`Failed to load frame ${i}`));
      img.src = frameDataUrls[i];
    });
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    if (!ctx) continue;
    ctx.drawImage(img, 0, 0);

    // 1) Detect horse box
    const { box, facing } = detectHorseBox(ctx, c.width, c.height);
    const detected = box.w < c.width * 0.8 && box.h < c.height * 0.8 && box.w > c.width * 0.06;

    // 2) Build phase-aware skeleton inside the box
    const phase = PHASES[i] || PHASES[0];
    const skeleton = buildSkeleton(box, facing, phase);

    // 3) Compute metrics
    const metrics = computeMetrics(skeleton, box);

    // 4) Subtle dim then draw
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.fillRect(0, 0, c.width, c.height);

    // ground reference
    const groundY = Math.max(skeleton.foreHoof.y, skeleton.hindHoof.y);
    strokeLine(ctx, { x: 8, y: groundY }, { x: c.width - 8, y: groundY }, GREEN, 1.2, true);

    // Draw single Secretariat-style extension triangle (apex under belly)
    drawExtensionTriangles(ctx, skeleton);
    // Skeleton on top
    drawSkeleton(ctx, skeleton);
    // Balance / spine / per-joint angle lines (visible on every frame)
    drawBalanceLines(ctx, skeleton, metrics, groundY, c.width);

    // Inline labels (placed AT the hooves so they don't overlap the apex angle)
    labelBox(ctx, `Front: ${metrics.frontReach?.toFixed(0)}°`,
      skeleton.foreHoof.x, skeleton.foreHoof.y + 22, GOLD, "center");
    labelBox(ctx, `Drive: ${metrics.rearDrive?.toFixed(0)}°`,
      skeleton.hindHoof.x, skeleton.hindHoof.y + 22, GOLD, "center");
    // Replace stride-metres label with Span (m) + Extension Ratio (% body) — frame-comparable
    if (metrics.spanM != null) {
      labelBox(ctx,
        `Span: ${metrics.spanM.toFixed(2)}m`,
        (skeleton.foreHoof.x + skeleton.hindHoof.x) / 2,
        groundY + 42, GOLD, "center");
    }
    if (metrics.extensionRatio != null) {
      labelBox(ctx,
        `Extension: ${metrics.extensionRatio}% body (${metrics.extensionQuality})`,
        (skeleton.foreHoof.x + skeleton.hindHoof.x) / 2,
        groundY + 62, GOLD, "center");
    }

    // Panels & header
    const phaseLabel = PHASE_LABELS[i] || `Frame ${i + 1}`;
    drawInfoPanel(ctx, i, phaseLabel, metrics);
    drawBiomechPanel(ctx, c.width, metrics);
    drawHeader(ctx, i, phaseLabel);
    drawWatermark(ctx, c.width, c.height);

    out.push({
      frameIndex: i,
      label: phaseLabel,
      annotatedDataUrl: c.toDataURL("image/jpeg", 0.92),
      confidence: detected ? 0.85 : 0.4,
      detected,
      metrics,
      imageWidth: c.width,
      imageHeight: c.height,
      // Normalised keypoints (0–1) so existing biomechanics code keeps working
      keypoints: {
        poll:        norm(skeleton.poll, c.width, c.height),
        withers:     norm(skeleton.withers, c.width, c.height),
        back:        norm(skeleton.back, c.width, c.height),
        croup:       norm(skeleton.croup, c.width, c.height),
        shoulder:    norm(skeleton.shoulder, c.width, c.height),
        elbow:       norm(skeleton.foreElbow, c.width, c.height),
        foreKnee:    norm(skeleton.foreKnee, c.width, c.height),
        foreFetlock: norm(skeleton.foreFetlock, c.width, c.height),
        foreHoof:    norm(skeleton.foreHoof, c.width, c.height),
        hip:         norm(skeleton.hip, c.width, c.height),
        stifle:      norm(skeleton.stifle, c.width, c.height),
        hock:        norm(skeleton.hock, c.width, c.height),
        hindFetlock: norm(skeleton.hindFetlock, c.width, c.height),
        hindHoof:    norm(skeleton.hindHoof, c.width, c.height),
        muzzle:      norm(skeleton.poll, c.width, c.height),
        chest:       norm(skeleton.chest, c.width, c.height),
        belly:       norm(skeleton.belly, c.width, c.height),
      },
      horseHeightWithers: norm(skeleton.withers, c.width, c.height),
    });
  }
  return out;
}

function norm(p: Pt, w: number, h: number): Pt {
  return { x: p.x / w, y: p.y / h };
}
