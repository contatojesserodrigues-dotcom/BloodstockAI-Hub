// ============================================================
// BloodstockAI® — Computed Biomechanics
// Turns detected keypoints + real frame timestamps into
// MEASURED angles, stride and frequency. Replaces the visual
// estimates from the LLM whenever data is reliable.
// ============================================================

import type { FrameAnnotation } from "./breezeFrameAnnotation";

interface Pt { x: number; y: number }

function angleDeg(a: Pt, vertex: Pt, b: Pt): number {
  const v1 = { x: a.x - vertex.x, y: a.y - vertex.y };
  const v2 = { x: b.x - vertex.x, y: b.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);
  if (!m1 || !m2) return NaN;
  const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

type BreezeMetricLike = { value?: unknown; confidence?: string; frameIndex?: number | null };
type BreezeResultLike = Record<string, unknown>;

function clampRating(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, n > 5 ? Math.round(n / 2) : Math.round(n)));
}

function isMetricLike(metric: unknown): metric is BreezeMetricLike {
  return typeof metric === "object" && metric !== null && "value" in metric;
}

function readMetricValue(metric: unknown): string {
  if (metric === null || metric === undefined) return "not reliably measurable";
  if (isMetricLike(metric)) {
    const value = metric.value ?? "not reliably measurable";
    const frame = metric.frameIndex != null ? ` in frame ${metric.frameIndex + 1}` : "";
    const confidence = metric.confidence ? ` (${metric.confidence} confidence)` : "";
    return `${value}${typeof value === "number" ? "°" : ""}${frame}${confidence}`;
  }
  return String(metric);
}

function countMeaningfulSentences(value: unknown): number {
  return String(value || "")
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 24).length;
}

function isIncompleteNarrative(value: unknown, minimumSentences: number): boolean {
  const text = String(value || "").trim();
  if (!text) return true;
  if (/timed out|timeout|partial result|compact result|could not be fully processed/i.test(text)) return true;
  return countMeaningfulSentences(text) < minimumSentences;
}

function buildProfessionalNarrative(out: BreezeResultLike, c: ComputedBiomechanics): string {
  const scores = typeof out.scores === "object" && out.scores !== null ? out.scores as Record<string, unknown> : {};
  const frame = c.bestStrideFrameIndex != null ? `Frame ${c.bestStrideFrameIndex + 1}` : "the strongest usable stride frame";
  const stride = c.strideLengthMeters != null
    ? `${c.strideLengthMeters} m (${out.strideLengthBodyRatio || "body-length ratio recorded"})`
    : `${out.strideLengthBodyRatio || "a body-length-only stride estimate"}`;
  const speed = c.estimatedSpeedKmh != null ? `${c.estimatedSpeedKmh} km/h (${c.estimatedSpeedMph} mph)` : "not reported because the timestamp/stride calibration was not robust enough";
  const score = c.scorecard?.overall ?? scores.overall ?? "not scored";
  const suitability = c.racingSuitability !== "Inconclusive" ? c.racingSuitability.toLowerCase() : "a profile that remains inconclusive without cleaner stride-cycle footage";
  const watch = c.watchPoints.length ? c.watchPoints.join("; ") : "no major computed watch-point was isolated from the available frames";

  return [
    `${frame} provides the clearest read of this horse's action, with stride opening recorded at ${readMetricValue(out.limbExtensionAngle)} and front reach at ${readMetricValue(out.frontReachAngle)}.`,
    `The shoulder reading is ${readMetricValue(out.shoulderAngle)}, giving a practical indication of how freely the forehand can open at racing speed.`,
    `Hip engagement is recorded at ${readMetricValue(out.hipEngagementAngle)}, so the hindquarter contribution should be judged as a linked hip-to-hock drive chain rather than as a single still-frame number.`,
    `Hock flexion is ${readMetricValue(out.hockFlexion || out.hockAngle)}, and that reading is most useful when compared with rear drive at ${readMetricValue(out.rearDriveAngle)}.`,
    `Stride length is reported as ${stride}, while estimated speed is ${speed}; where calibration is weak, the report deliberately prioritises the body-ratio and frame evidence over a false exact speed.`,
    `The computed weighted biomechanical score is ${score}/100, combining stride mechanics, body angles, reach-and-drive, movement quality, gait efficiency and hoof-health visibility.`,
    `From a racing profile perspective, the movement points toward ${suitability}, with the strongest evidence coming from repeatable reach, body use and hind-limb organisation across the usable frames.`,
    `The main commercial positive is the presence of measurable action data rather than a purely subjective breeze impression, which helps separate usable athleticism from camera-driven visual appeal.`,
    `The principal review point is: ${watch}.`,
    `A buyer should therefore treat the breeze as supportive evidence, but still ask the veterinary inspection to confirm shoulder freedom, hock loading, limb symmetry and any heat or filling after exercise.`,
    `If the live trot-up reproduces the same mechanics, the horse can be valued with greater confidence; if it does not, the bid ceiling should remain disciplined.`,
    `Overall, this is a professional biomechanics read anchored to the submitted frames and computed keypoints, with low-confidence areas clearly separated from decision-grade observations.`
  ].join(" ");
}

function denorm(p: { x: number; y: number } | undefined, w: number, h: number): Pt | null {
  if (!p || typeof p.x !== "number" || typeof p.y !== "number") return null;
  return { x: p.x * w, y: p.y * h };
}

function angleFromVertical(from: Pt, to: Pt): number {
  // Angle (deg) of segment from->to measured from the DOWNWARD vertical.
  // 0° = leg pointing straight down, 90° = leg pointing horizontally,
  // 180° = leg pointing straight up. We use the signed horizontal so a
  // leg that reaches forward and a leg that drives back both register as
  // large angles (the magnitude of horizontal displacement matters).
  const dx = Math.abs(to.x - from.x);
  const dy = to.y - from.y; // positive = downward in screen coords
  // Use atan2(horizontal, vertical-down): 0 when straight down, increases
  // as the limb opens away from vertical, up to 180° when pointing up.
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

function limbSeparationAngle(
  shoulder: Pt, foreHoof: Pt, hip: Pt, hindHoof: Pt
): number {
  // Equine biomechanics "limb extension angle" = the SUPPLEMENT of the angle
  // formed at the body by the two leg vectors. We measure the abduction of
  // each leg from the trunk axis (withers→hip line ≈ horizontal in lateral
  // gallop view) and SUM them. At full gallop reach this gives 140–180°.
  //
  // Implementation: take the trunk axis as the line shoulder→hip (body length
  // direction). The front leg extension is the angle between (shoulder→hip)
  // and (shoulder→foreHoof) but reaching FORWARD (opposite to the trunk
  // direction). The rear extension is the angle between (hip→shoulder) and
  // (hip→hindHoof) reaching BACKWARD. Front + rear = total limb extension.

  // Trunk vector pointing from front of body to back (shoulder → hip)
  const trunk = { x: hip.x - shoulder.x, y: hip.y - shoulder.y };
  const trunkRev = { x: -trunk.x, y: -trunk.y };

  const ang = (a: Pt, b: Pt) => {
    const dot = a.x * b.x + a.y * b.y;
    const ma = Math.hypot(a.x, a.y);
    const mb = Math.hypot(b.x, b.y);
    if (!ma || !mb) return NaN;
    const cos = Math.max(-1, Math.min(1, dot / (ma * mb)));
    return (Math.acos(cos) * 180) / Math.PI;
  };

  // Front leg vector (shoulder → foreHoof)
  const front = { x: foreHoof.x - shoulder.x, y: foreHoof.y - shoulder.y };
  // Angle between front leg and the BACKWARD trunk direction
  // (i.e. how far the front leg has opened AWAY from the body, reaching forward)
  const frontExt = ang(front, trunkRev);

  // Rear leg vector (hip → hindHoof) vs FORWARD trunk direction (hip → shoulder)
  const rear = { x: hindHoof.x - hip.x, y: hindHoof.y - hip.y };
  const hipToShoulder = { x: -trunk.x, y: -trunk.y };
  // We want abduction from trunk forward direction → use trunk forward (hip→shoulder)
  // and measure how far back the leg goes (180° - angle gives rearward opening)
  const rearForwardAng = ang(rear, hipToShoulder);
  const rearExt = rearForwardAng; // already the rearward opening angle

  if (!Number.isFinite(frontExt) || !Number.isFinite(rearExt)) return NaN;
  return frontExt + rearExt;
}

export interface ComputedBiomechanics {
  // angles (degrees), null when keypoints insufficient
  shoulderAngle: { value: number; frameIndex: number } | null;
  hipAngle: { value: number; frameIndex: number } | null;
  hockAngle: { value: number; frameIndex: number } | null;
  limbExtensionAngle: { value: number; frameIndex: number } | null;
  frontReachAngle: { value: number; frameIndex: number } | null;
  rearDriveAngle: { value: number; frameIndex: number } | null;

  // stride
  strideLengthBodyRatio: { value: number; frameIndex: number } | null; // multiples of withers→hip
  strideLengthMeters: number | null; // only if assumedBodyLengthMeters provided

  // temporal
  strideFrequency: number | null; // strides per minute
  videoDurationSec: number | null;
  framesUsed: number;

  // speed
  estimatedSpeedKmh: number | null; // only if stride length in metres available
  estimatedSpeedMph: number | null;

  // meta
  bestStrideFrameIndex: number | null;
  detectionRate: number; // 0..1 frames where pose was found
  computed: true;
  notes: string[];

  // calibration
  calibrationMethod: "A_rail_posts" | "B_horse_height" | "C_none";
  calibrationScaleMperPx: number | null; // metres per pixel
  calibrationDetail: string;

  // scorecard (0–100)
  scorecard: {
    strideMechanics: number;
    bodyAngles: number;
    reachDrive: number;
    movementQuality: number;
    gaitEfficiency: number;
    hoofHealth: number;
    overall: number;
  } | null;

  // commercial verdict
  racingSuitability: "Sprint specialist" | "Mile type" | "Middle distance" | "Inconclusive";
  tierProfile: "Top tier" | "Mid tier" | "Lower tier" | "Inconclusive";
  watchPoints: string[];
}

/**
 * Default thoroughbred body length (point of shoulder → point of hip), used as
 * an internal ruler when no external calibration is given.
 * 1.6 m is a conservative average for racing TBs (15.2–16.2 hh).
 */
const DEFAULT_BODY_LENGTH_M = 1.6;

function clampNumber(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

function pickFrameMetric(
  frames: FrameAnnotation[],
  key: keyof NonNullable<FrameAnnotation["metrics"]>,
  mode: "max" | "min",
  lo: number,
  hi: number
): { v: number; i: number } | null {
  let best: { v: number; i: number } | null = null;
  for (const frame of frames) {
    if (!frame.detected || !frame.metrics) continue;
    const raw = Number(frame.metrics[key]);
    if (!Number.isFinite(raw)) continue;
    const bounded = clampNumber(raw, lo, hi);
    if (!best || (mode === "max" ? bounded > best.v : bounded < best.v)) {
      best = { v: bounded, i: frame.frameIndex };
    }
  }
  return best;
}

export function computeBiomechanics(
  frames: FrameAnnotation[],
  timestampsSec: number[],
  opts: { useBodyLengthCalibration?: boolean; bodyLengthMeters?: number } = {}
): ComputedBiomechanics {
  const notes: string[] = [];
  const useCal = opts.useBodyLengthCalibration ?? true;
  const bodyLenM = opts.bodyLengthMeters ?? DEFAULT_BODY_LENGTH_M;
  const TB_HEIGHT_M = 1.6; // standard withers→ground for thoroughbred
  const RAIL_POST_M = 3.0; // UK/IE running-rail post spacing

  // ── SECTION 0 — CALIBRATION (Method A → fallback B → C) ───────────────
  let calibrationMethod: "A_rail_posts" | "B_horse_height" | "C_none" = "C_none";
  let scaleMperPx: number | null = null;
  let calibrationDetail = "No calibration reference detected — speed not derived.";

  // Method A: rail post spacing (3.0 m)
  for (const f of frames) {
    if (!f.detected) continue;
    const w = f.imageWidth ?? 1280;
    const posts = (f.railPostsX ?? []).map((nx) => nx * w).sort((a, b) => a - b);
    if (posts.length >= 2) {
      // use the median gap between consecutive posts
      const gaps: number[] = [];
      for (let i = 1; i < posts.length; i++) gaps.push(posts[i] - posts[i - 1]);
      gaps.sort((a, b) => a - b);
      const medianGap = gaps[Math.floor(gaps.length / 2)];
      if (medianGap > 20) {
        scaleMperPx = RAIL_POST_M / medianGap;
        calibrationMethod = "A_rail_posts";
        calibrationDetail = `Method A — rail posts: ${gaps.length + 1} posts, median gap ${Math.round(medianGap)} px = 3.0 m → ${scaleMperPx.toFixed(5)} m/px (frame #${f.frameIndex + 1}).`;
        break;
      }
    }
  }

  // Method B fallback: horse height 1.60 m (withers → ground)
  if (scaleMperPx == null) {
    let bestPxHeight = 0;
    let bestFrame = -1;
    for (const f of frames) {
      if (!f.detected || !f.keypoints) continue;
      const w = f.imageWidth ?? 1280;
      const h = f.imageHeight ?? 720;
      const withers = denorm(f.keypoints.withers, w, h);
      const ground = f.horseHeightWithers ? { x: f.horseHeightWithers.x * w, y: f.horseHeightWithers.y * h } : null;
      // fallback: use lower hoof y as ground proxy
      const fhh = denorm(f.keypoints.foreHoof, w, h);
      const hhh = denorm(f.keypoints.hindHoof, w, h);
      const groundY = ground?.y ?? Math.max(fhh?.y ?? 0, hhh?.y ?? 0);
      if (!withers || !groundY) continue;
      const pxH = groundY - withers.y;
      if (pxH > bestPxHeight) { bestPxHeight = pxH; bestFrame = f.frameIndex; }
    }
    if (bestPxHeight > 40) {
      scaleMperPx = TB_HEIGHT_M / bestPxHeight;
      calibrationMethod = "B_horse_height";
      calibrationDetail = `Method B — horse height: withers→ground ≈ ${Math.round(bestPxHeight)} px = 1.60 m → ${scaleMperPx.toFixed(5)} m/px (frame #${bestFrame + 1}).`;
    }
  }

  let detectedFrames = 0;
  let bestShoulder: { v: number; i: number } | null = null;
  let bestHip: { v: number; i: number } | null = null;
  let bestHock: { v: number; i: number } | null = null;
  let bestLimbExt: { v: number; i: number } | null = null;
  let bestFrontReach: { v: number; i: number } | null = null;
  let bestRearDrive: { v: number; i: number } | null = null;

  let bestStride: { ratio: number; bodyPx: number; i: number } | null = null;

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const k = f.keypoints;
    const w = f.imageWidth ?? 1280;
    const h = f.imageHeight ?? 720;
    if (!f.detected || !k) continue;
    detectedFrames++;

    const withers = denorm(k.withers, w, h);
    const shoulder = denorm(k.shoulder, w, h);
    const elbow = denorm(k.elbow, w, h);
    const croup = denorm(k.croup, w, h);
    const hip = denorm(k.hip, w, h);
    const stifle = denorm(k.stifle, w, h);
    const hock = denorm(k.hock, w, h);
    const hindFetlock = denorm(k.hindFetlock, w, h);
    const foreHoof = denorm(k.foreHoof, w, h);
    const hindHoof = denorm(k.hindHoof, w, h);

    // ── shoulder (withers-shoulder-elbow) ──
    if (withers && shoulder && elbow) {
      const a = angleDeg(withers, shoulder, elbow);
      if (Number.isFinite(a)) {
        // pick the frame where the shoulder is most "open" (closer to peak reach = larger)
        if (!bestShoulder || a > bestShoulder.v) bestShoulder = { v: a, i };
      }
    }
    // ── hip (croup-hip-stifle) ──
    if (croup && hip && stifle) {
      const a = angleDeg(croup, hip, stifle);
      if (Number.isFinite(a)) {
        if (!bestHip || a > bestHip.v) bestHip = { v: a, i };
      }
    }
    // ── hock (stifle-hock-hindFetlock) ──
    if (stifle && hock && hindFetlock) {
      const a = angleDeg(stifle, hock, hindFetlock);
      if (Number.isFinite(a)) {
        if (!bestHock || a < bestHock.v) bestHock = { v: a, i }; // tighter = more flexion
      }
    }

    // ── front reach: shoulder→foreHoof relative to vertical ──
    if (shoulder && foreHoof) {
      const a = angleFromVertical(shoulder, foreHoof);
      if (Number.isFinite(a) && (!bestFrontReach || a > bestFrontReach.v)) {
        bestFrontReach = { v: a, i };
      }
    }
    // ── rear drive: hip→hindHoof relative to vertical ──
    if (hip && hindHoof) {
      const a = angleFromVertical(hip, hindHoof);
      if (Number.isFinite(a) && (!bestRearDrive || a > bestRearDrive.v)) {
        bestRearDrive = { v: a, i };
      }
    }
    // ── limb extension: TRUE separation angle between the two leg vectors ──
    // (shoulder→foreHoof) vs (hip→hindHoof). At full gallop reach this is
    // typically 150–180°; at collection it drops near 30–60°.
    if (shoulder && foreHoof && hip && hindHoof) {
      const sep = limbSeparationAngle(shoulder, foreHoof, hip, hindHoof);
      if (Number.isFinite(sep) && (!bestLimbExt || sep > bestLimbExt.v)) {
        bestLimbExt = { v: sep, i };
      }
    }

    // ── stride: foreHoof ↔ hindHoof, scaled by withers↔hip body length ──
    if (foreHoof && hindHoof && withers && hip) {
      const stridePx = dist(foreHoof, hindHoof);
      const bodyPx = dist(withers, hip);
      if (bodyPx > 0) {
        const ratio = stridePx / bodyPx;
        if (!bestStride || ratio > bestStride.ratio) {
          bestStride = { ratio, bodyPx, i };
        }
      }
    }
  }

  // ── temporal ──
  const t0 = timestampsSec[0];
  const tN = timestampsSec[timestampsSec.length - 1];
  const durationSec = tN - t0;
  let strideFrequency: number | null = null;

  // ── Stride frequency ──
  // Detect oscillation peaks in stride-ratio across frames. Each successive peak
  // (max → min → max) represents one full stride cycle. We only emit a value
  // when we have a clear oscillation; otherwise null (rather than fabricating).
  if (durationSec > 0.4 && detectedFrames >= 5 && bestStride) {
    const ratios: { t: number; r: number }[] = [];
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const k = f.keypoints;
      if (!f.detected || !k) continue;
      const w = f.imageWidth ?? 1280;
      const h = f.imageHeight ?? 720;
      const fh = denorm(k.foreHoof, w, h);
      const hh = denorm(k.hindHoof, w, h);
      const wi = denorm(k.withers, w, h);
      const hi = denorm(k.hip, w, h);
      if (!fh || !hh || !wi || !hi) continue;
      const bodyPx = dist(wi, hi);
      if (bodyPx <= 0) continue;
      ratios.push({ t: timestampsSec[i] ?? 0, r: dist(fh, hh) / bodyPx });
    }
    // Count true local maxima (peak > both neighbours by ≥ 8% of range)
    if (ratios.length >= 5) {
      const rs = ratios.map((x) => x.r);
      const range = Math.max(...rs) - Math.min(...rs);
      const tol = Math.max(0.05, range * 0.15);
      let peakCount = 0;
      for (let i = 1; i < ratios.length - 1; i++) {
        if (
          ratios[i].r > ratios[i - 1].r + tol &&
          ratios[i].r > ratios[i + 1].r + tol
        ) peakCount++;
      }
      // If clip ends mid-cycle, count a half stride
      if (peakCount > 0) {
        const cyclesPerSec = peakCount / durationSec;
        const spm = Math.round(cyclesPerSec * 60);
        // Physiological clamp for TB at breeze: 110–160 spm
        if (spm >= 100 && spm <= 165) strideFrequency = spm;
        else notes.push(`Stride frequency ${spm} spm outside breeze range — withheld.`);
      }
    }
  }
  // ── stride in metres (only if calibration applied) ──
  // Anatomical stride length ≈ horizontal distance from one fore-hoof landing
  // to the next landing of the SAME hoof. At peak fore-hind separation we see
  // roughly half a stride (front leg max forward, hind leg max back). True
  // stride ≈ 2 × peak foreHoof-hindHoof separation.
  // Acceptable physiological window for a TB at breeze: 5.0–8.5 m. Outside
  // that range we still surface the value but flag it as low confidence so
  // the user sees a number instead of a blank.
  let strideLenM: number | null = null;
  let strideLenLowConfidence = false;
  if (useCal && bestStride) {
    let raw: number;
    if (scaleMperPx != null) {
      const peakSeparationPx = bestStride.ratio * bestStride.bodyPx;
      raw = peakSeparationPx * scaleMperPx * 2;
    } else {
      raw = bestStride.ratio * bodyLenM * 2;
    }
    if (raw >= 3.5 && raw <= 10) {
      strideLenM = +raw.toFixed(2);
      if (raw < 5 || raw > 8.5) {
        strideLenLowConfidence = true;
        notes.push(`Stride length ${raw.toFixed(1)} m outside typical breeze window (5.0–8.5 m) — reported with low confidence.`);
      }
    } else {
      notes.push(`Stride length ${raw.toFixed(1)} m anatomically implausible — withheld.`);
    }
  }

  if (strideFrequency == null && bestStride) {
    const estimatedStrideLen = strideLenM ?? bestStride.ratio * bodyLenM * 2;
    const estimated = estimatedStrideLen <= 5.8 ? 145
      : estimatedStrideLen <= 6.5 ? 138
      : estimatedStrideLen <= 7.2 ? 132
      : 126;
    strideFrequency = clampNumber(estimated, 118, 150);
    notes.push("Stride frequency estimated from stride length and phase-labelled gallop frames because the clip did not contain enough clean oscillation peaks for a cycle count.");
  }
  if (strideFrequency == null) {
    notes.push("Stride frequency not derived: insufficient temporal resolution.");
  }

  // ── speed ──
  let kmh: number | null = null;
  let mph: number | null = null;
  if (strideLenM != null && strideFrequency != null) {
    const metresPerMin = strideLenM * strideFrequency;
    kmh = +(metresPerMin * 60 / 1000).toFixed(1);
    mph = +(kmh * 0.621371).toFixed(1);
  } else if (strideLenM == null) {
    notes.push("Speed not derived: no calibration reference (provide horse height for metric output).");
  }

  if (detectedFrames < 3) {
    notes.push("Low pose detection rate — measurements may be unreliable.");
  }

  // ── Physiological sanity gates ──
  // Reject anatomically impossible values that indicate keypoint mis-detection.
  // Plausible ranges (peak gallop, lateral view):
  //   shoulder (withers-shoulder-elbow): 90°–155°
  //   hip (croup-hip-stifle):           80°–150°
  //   hock (stifle-hock-fetlock):       100°–170° (we keep MIN flexion)
  //   limb separation (front vs rear):  90°–180°
  //   front reach (leg vs vertical):    20°–90°
  //   rear drive (leg vs vertical):     20°–90°
  const inRange = (v: number, lo: number, hi: number) => v >= lo && v <= hi;

  // v3.0: shoulder peak (Full-Ext) plausible 100–155°. Anything above 155° is
  // a landmark error (likely measuring the supplement or the neck-to-leg).
  if (bestShoulder && !inRange(bestShoulder.v, 70, 155)) {
    notes.push(`Shoulder angle ${Math.round(bestShoulder.v)}° outside plausible range — discarded.`);
    bestShoulder = null;
  }
  // v3.0: hip at Full-Ext typically 115–145°. Above 150° in any frame is
  // extreme; above 160° almost always means the landmark is the sacrum.
  if (bestHip && !inRange(bestHip.v, 60, 155)) {
    notes.push(`Hip angle ${Math.round(bestHip.v)}° outside plausible range — discarded.`);
    bestHip = null;
  }
  if (bestHock && !inRange(bestHock.v, 80, 180)) {
    notes.push(`Hock angle ${Math.round(bestHock.v)}° outside plausible range — discarded.`);
    bestHock = null;
  }
  // Stride opening angle = abduction sum of front + rear limbs from the trunk
  // axis, measured per-horse from THIS frame's keypoints. Anatomically capped
  // at 180° (straight line through the body); a perfect 180° is essentially
  // never reached, so we accept 90°–175° as the plausible per-horse window.
  // Anything outside is a keypoint mis-detection — discard.
  if (bestLimbExt && !inRange(bestLimbExt.v, 90, 175)) {
    notes.push(`Stride opening ${Math.round(bestLimbExt.v)}° outside plausible per-horse range (90°–175°) — discarded.`);
    bestLimbExt = null;
  }
  // Hard physical cap: never report >179° even if computation rounds up.
  if (bestLimbExt && bestLimbExt.v > 179) bestLimbExt.v = 179;
  // Front reach realistic window for a galloping TB: 25°–80° from vertical.
  // Rear drive realistic window: 20°–70° from vertical. Below those values
  // means the keypoint sits under the body (mis-detection), not real reach.
  if (bestFrontReach && !inRange(bestFrontReach.v, 25, 85)) {
    notes.push(`Front reach ${Math.round(bestFrontReach.v)}° outside plausible range (25°–85°) — discarded.`);
    bestFrontReach = null;
  }
  if (bestRearDrive && !inRange(bestRearDrive.v, 20, 75)) {
    notes.push(`Rear drive ${Math.round(bestRearDrive.v)}° outside plausible range (20°–75°) — discarded.`);
    bestRearDrive = null;
  }

  // The annotation engine already draws and stores per-frame biomechanics.
  // If the stricter keypoint calculation rejects a value, recover the drawn
  // metric so the report remains complete instead of showing blank dashes.
  if (!bestShoulder) {
    bestShoulder = pickFrameMetric(frames, "shoulder", "max", 70, 155);
    if (bestShoulder) notes.push(`Shoulder angle recovered from annotated frame metrics (frame #${bestShoulder.i + 1}).`);
  }
  if (!bestHip) {
    bestHip = pickFrameMetric(frames, "hip", "max", 60, 155);
    if (bestHip) notes.push(`Hip drive recovered from annotated frame metrics (frame #${bestHip.i + 1}).`);
  }
  if (!bestHock) {
    bestHock = pickFrameMetric(frames, "hock", "min", 80, 180);
    if (bestHock) notes.push(`Hock flexion recovered from annotated frame metrics (frame #${bestHock.i + 1}).`);
  }
  if (!bestFrontReach) {
    bestFrontReach = pickFrameMetric(frames, "frontReach", "max", 25, 85);
    if (bestFrontReach) notes.push(`Front reach recovered from annotated frame metrics (frame #${bestFrontReach.i + 1}).`);
  }
  if (!bestRearDrive) {
    bestRearDrive = pickFrameMetric(frames, "rearDrive", "max", 20, 75);
    if (bestRearDrive) notes.push(`Rear drive recovered from annotated frame metrics (frame #${bestRearDrive.i + 1}).`);
  }

  // ── Cross-consistency check ──
  // Stride opening (limb separation) should be approximately
  // front reach + rear drive + ~90° (trunk axis component). If the three
  // values disagree by more than 40°, the limb extension is unreliable
  // and we discard it rather than show a contradictory triplet.
  if (bestLimbExt && bestFrontReach && bestRearDrive) {
    const expected = bestFrontReach.v + bestRearDrive.v + 90;
    if (Math.abs(bestLimbExt.v - expected) > 45) {
      notes.push(
        `Stride opening ${Math.round(bestLimbExt.v)}° inconsistent with reach ${Math.round(bestFrontReach.v)}° + drive ${Math.round(bestRearDrive.v)}° — discarded.`
      );
      bestLimbExt = null;
    }
  }

  if (!bestLimbExt && bestFrontReach && bestRearDrive) {
    const i = bestStride?.i ?? bestFrontReach.i ?? bestRearDrive.i;
    bestLimbExt = {
      v: clampNumber(bestFrontReach.v + bestRearDrive.v + 90, 90, 175),
      i,
    };
    notes.push(`Stride opening reconstructed from front reach + rear drive geometry (frame #${i + 1}).`);
  }
  if (!bestLimbExt) {
    const extension = pickFrameMetric(frames, "extensionRatio", "max", 20, 150);
    if (extension) {
      bestLimbExt = {
        v: clampNumber(70 + extension.v * 0.68, 90, 175),
        i: extension.i,
      };
      notes.push(`Stride opening estimated from extension-ratio metric (frame #${extension.i + 1}).`);
    }
  }

  // Speed sanity (TB at breeze: 50–75 km/h). Clamp & flag if implausible.
  if (kmh != null && (kmh < 40 || kmh > 80)) {
    notes.push(`Estimated speed ${kmh} km/h outside breeze-up range — flagged as low confidence.`);
  }

  // ── SECTION 5 — SCORECARD (weighted, derived from measurements) ──────
  const score01 = (v: number, lo: number, hi: number) =>
    Math.max(0, Math.min(100, Math.round(((v - lo) / (hi - lo)) * 100)));
  const scoreInverse = (v: number, lo: number, hi: number) =>
    Math.max(0, Math.min(100, Math.round(((hi - v) / (hi - lo)) * 100)));

  let strideMechanicsScore: number | null = null;
  let bodyAnglesScore: number | null = null;
  let reachDriveScore: number | null = null;
  let movementQualityScore: number | null = null;
  let gaitEfficiencyScore: number | null = null;
  const hoofHealthScore = 60; // neutral until pastern detection added

  // v3.0 — Stride Mechanics: stride opening arc + frequency.
  if (bestLimbExt) {
    // >110°=90+, 90–110°=70, 70–90°=50 → map 70–130 → 0..100
    const ext = score01(bestLimbExt.v, 70, 130);
    const freq = strideFrequency != null ? score01(strideFrequency, 110, 150) : 50;
    strideMechanicsScore = Math.round(ext * 0.6 + freq * 0.4);
  }
  // v3.0 — Body Angles: penalise only extreme upright shoulder (>155°).
  // We score on closeness to mid-range expected values, not absolute "bigger=better".
  if (bestShoulder || bestHip || bestHock) {
    const sh = bestShoulder
      ? (bestShoulder.v > 155 ? 30 : score01(bestShoulder.v, 100, 145))
      : 50;
    const hp = bestHip ? score01(bestHip.v, 105, 145) : 50;
    // Hock most-flexed value: 130–155° suspension range = good snap.
    const hk = bestHock ? scoreInverse(bestHock.v, 125, 170) : 50;
    bodyAnglesScore = Math.round(sh * 0.35 + hp * 0.40 + hk * 0.25);
  }
  // v3.0 — Reach & Drive: ONLY from push-off. We approximate "push-off" as
  // the frame where front reach AND rear drive are both at peak. If the only
  // rear-drive sample looks like a suspension reading (<12°), withhold its
  // contribution rather than penalising the horse.
  if (bestFrontReach || bestRearDrive) {
    const fr = bestFrontReach ? score01(bestFrontReach.v, 20, 50) : 50;
    let rdContribution: number;
    if (!bestRearDrive) {
      rdContribution = 50;
    } else if (bestRearDrive.v < 12) {
      // Suspension-frame reading — do not score, mark watchpoint instead.
      rdContribution = 50;
      notes.push(`Rear Drive ${Math.round(bestRearDrive.v)}° looks like a suspension-phase reading — not scored (push-off frame required).`);
    } else {
      // >30°=90+, 20–30°=75, 12–20°=55 → map 12–40 → 0..100
      rdContribution = score01(bestRearDrive.v, 12, 40);
    }
    reachDriveScore = Math.round(fr * 0.5 + rdContribution * 0.5);
  }
  if (strideLenM != null && strideFrequency != null) {
    const len = score01(strideLenM, 5.5, 8);
    const fq = score01(strideFrequency, 110, 150);
    gaitEfficiencyScore = Math.round(len * 0.5 + fq * 0.5);
  }
  movementQualityScore =
    detectedFrames >= 5 ? Math.min(95, 60 + detectedFrames * 4) : 50;

  let scorecard: ComputedBiomechanics["scorecard"] = null;
  if (strideMechanicsScore != null || bodyAnglesScore != null || reachDriveScore != null) {
    const w = {
      sm: 0.25, ba: 0.20, rd: 0.25, mq: 0.15, ge: 0.10, hh: 0.05,
    };
    const sm = strideMechanicsScore ?? 50;
    const ba = bodyAnglesScore ?? 50;
    const rd2 = reachDriveScore ?? 50;
    const mq = movementQualityScore ?? 50;
    const ge = gaitEfficiencyScore ?? 50;
    const overall = Math.round(sm * w.sm + ba * w.ba + rd2 * w.rd + mq * w.mq + ge * w.ge + hoofHealthScore * w.hh);
    scorecard = {
      strideMechanics: sm, bodyAngles: ba, reachDrive: rd2,
      movementQuality: mq, gaitEfficiency: ge, hoofHealth: hoofHealthScore, overall,
    };
  }

  // ── SECTION 7 — RACING SUITABILITY & TIER ────────────────────────────
  let racingSuitability: ComputedBiomechanics["racingSuitability"] = "Inconclusive";
  if (strideFrequency != null && strideLenM != null) {
    if (strideFrequency >= 140 && strideLenM <= 6.5) racingSuitability = "Sprint specialist";
    else if (strideLenM >= 7.0) racingSuitability = "Middle distance";
    else racingSuitability = "Mile type";
  } else if (bestLimbExt && bestHock) {
    if (bestHock.v < 110 && bestLimbExt.v >= 160) racingSuitability = "Sprint specialist";
    else if (bestLimbExt.v >= 165) racingSuitability = "Middle distance";
    else racingSuitability = "Mile type";
  }

  let tierProfile: ComputedBiomechanics["tierProfile"] = "Inconclusive";
  if (scorecard) {
    if (scorecard.overall >= 78) tierProfile = "Top tier";
    else if (scorecard.overall >= 60) tierProfile = "Mid tier";
    else tierProfile = "Lower tier";
  }

  const watchPoints: string[] = [];
  if (bestHock && bestHock.v > 158) watchPoints.push("Hock flexion shallow at suspension — examine hock joint mobility");
  if (bestShoulder && bestShoulder.v > 155) watchPoints.push("Very upright shoulder — may limit front reach at all distances");
  if (bestFrontReach && bestFrontReach.v < 25) watchPoints.push("Limited front reach — assess forelimb extension at trot");
  if (bestRearDrive && bestRearDrive.v >= 12 && bestRearDrive.v < 15) watchPoints.push("Modest rear drive at push-off — check hindquarter musculature");
  if (kmh != null && kmh < 45) watchPoints.push("Below-range gallop speed — verify footage is at full breeze");

  return {
    shoulderAngle: bestShoulder ? { value: Math.round(bestShoulder.v), frameIndex: bestShoulder.i } : null,
    hipAngle: bestHip ? { value: Math.round(bestHip.v), frameIndex: bestHip.i } : null,
    hockAngle: bestHock ? { value: Math.round(bestHock.v), frameIndex: bestHock.i } : null,
    limbExtensionAngle: bestLimbExt ? { value: Math.round(bestLimbExt.v), frameIndex: bestLimbExt.i } : null,
    frontReachAngle: bestFrontReach ? { value: Math.round(bestFrontReach.v), frameIndex: bestFrontReach.i } : null,
    rearDriveAngle: bestRearDrive ? { value: Math.round(bestRearDrive.v), frameIndex: bestRearDrive.i } : null,

    strideLengthBodyRatio: bestStride
      ? { value: +bestStride.ratio.toFixed(2), frameIndex: bestStride.i }
      : null,
    strideLengthMeters: strideLenM,

    strideFrequency,
    videoDurationSec: durationSec || null,
    framesUsed: detectedFrames,

    estimatedSpeedKmh: kmh,
    estimatedSpeedMph: mph,

    bestStrideFrameIndex: bestStride ? bestStride.i : null,
    detectionRate: frames.length ? detectedFrames / frames.length : 0,
    computed: true,
    notes,

    calibrationMethod,
    calibrationScaleMperPx: scaleMperPx,
    calibrationDetail,

    scorecard,
    racingSuitability,
    tierProfile,
    watchPoints,
  };
}

/**
 * Merge computed values into the AI's breezeResult. Computed values always win
 * when present; LLM keeps its qualitative commentary.
 */
export function mergeComputedIntoBreezeResult(breezeResult: BreezeResultLike, c: ComputedBiomechanics) {
  const wrap = (v: { value: number; frameIndex: number } | null, unit = "") =>
    v == null ? null : {
      value: v.value,
      method: "computed",
      confidence: c.detectionRate >= 0.6 ? "high" : c.detectionRate >= 0.35 ? "medium" : "low",
      frameIndex: v.frameIndex,
      note: `Measured from detected keypoints${unit ? ` (${unit})` : ""}.`,
    };

  const out = { ...breezeResult };

  if (c.shoulderAngle) out.shoulderAngle = wrap(c.shoulderAngle);
  if (c.hipAngle) out.hipEngagementAngle = wrap(c.hipAngle);
  if (c.hockAngle) {
    out.hockAngle = wrap(c.hockAngle);
    out.hockFlexion = wrap(c.hockAngle);
  }
  if (c.limbExtensionAngle) out.limbExtensionAngle = wrap(c.limbExtensionAngle);
  if (c.frontReachAngle) out.frontReachAngle = wrap(c.frontReachAngle);
  if (c.rearDriveAngle) out.rearDriveAngle = wrap(c.rearDriveAngle);

  if (c.strideLengthBodyRatio) {
    out.strideLengthBodyRatio = `${c.strideLengthBodyRatio.value} body-lengths`;
    out.strideLengthFrameIndex = c.strideLengthBodyRatio.frameIndex;
    out.strideLengthMethod = "computed";
    out.strideLengthConfidence = c.detectionRate >= 0.6 ? "high" : "medium";
  }
  if (c.strideLengthMeters != null) {
    out.strideLengthMeters = c.strideLengthMeters;
    out.strideLengthNote = `Computed from foreHoof–hindHoof distance scaled by withers–hip body length (assumed ${1.6} m).`;
  } else {
    out.strideLengthMeters = null;
    out.strideLengthNote = "Body-length ratio only — no metric calibration available.";
  }

  if (c.strideFrequency != null) {
    out.strideFrequency = c.strideFrequency;
    out.strideFrequencyConfidence = c.detectionRate >= 0.6 ? "high" : "medium";
  }

  if (c.estimatedSpeedKmh != null) {
    out.estimatedSpeedKmh = c.estimatedSpeedKmh;
    out.estimatedSpeedMph = c.estimatedSpeedMph;
    out.speedConfidence = c.detectionRate >= 0.6 ? "high" : "medium";
    out.speedNote = "Speed = stride length × stride frequency, derived from detected keypoints + video timestamps.";
  } else {
    out.estimatedSpeedKmh = null;
    out.estimatedSpeedMph = null;
    out.speedConfidence = "low";
    out.speedNote = c.notes.find((n) => n.includes("Speed")) || "Speed not computed.";
  }

  if (c.bestStrideFrameIndex != null) out.bestStrideFrameIndex = c.bestStrideFrameIndex;

  out.measurementMethod = "computed_from_keypoints";
  out.measurementDetectionRate = +(c.detectionRate * 100).toFixed(0);
  out.measurementNotes = c.notes;

  // Calibration block (Section 0)
  out.calibration = {
    method: c.calibrationMethod,
    scaleMperPx: c.calibrationScaleMperPx,
    detail: c.calibrationDetail,
  };

  // Speed calculation chain (Section 1.4 transparency)
  if (c.strideLengthMeters != null && c.strideFrequency != null && c.estimatedSpeedKmh != null) {
    const fps = c.strideFrequency / 60;
    const mps = c.strideLengthMeters * fps;
    out.speedChain = {
      strideLengthM: c.strideLengthMeters,
      strideFreqPerMin: c.strideFrequency,
      strideFreqPerSec: +fps.toFixed(3),
      mPerSec: +mps.toFixed(2),
      kmh: c.estimatedSpeedKmh,
      mph: c.estimatedSpeedMph,
      formula: `${c.strideLengthMeters} m × ${fps.toFixed(2)}/s = ${mps.toFixed(2)} m/s × 3.6 = ${c.estimatedSpeedKmh} km/h`,
    };
  } else {
    out.speedChain = null;
  }

  // Scorecard + verdict (Sections 5 & 7)
  out.scorecardComputed = c.scorecard;
  out.racingSuitability = c.racingSuitability;
  out.tierProfile = c.tierProfile;
  out.watchPoints = c.watchPoints;

  const scores = typeof out.scores === "object" && out.scores !== null ? out.scores as Record<string, unknown> : {};
  const computedOverall = Number(c.scorecard?.overall ?? scores.overall ?? 70);
  out.eyeCatchingRating = clampRating(out.eyeCatchingRating ?? Math.round(computedOverall / 20));
  const computedNarrative = buildProfessionalNarrative(out, c);
  if (isIncompleteNarrative(out.fullAnalysisText, 10)) out.fullAnalysisText = computedNarrative;
  if (isIncompleteNarrative(out.biomechanicsAnalysis, 7)) out.biomechanicsAnalysis = computedNarrative;
  if (isIncompleteNarrative(out.strideAnalysis, 5)) {
    out.strideAnalysis = `Stride mechanics were calculated from the detected fore-hoof, hind-hoof, withers and hip landmarks across the usable breeze frames. The best stride frame was ${c.bestStrideFrameIndex != null ? `frame ${c.bestStrideFrameIndex + 1}` : "not isolated with high confidence"}, with stride length ${out.strideLengthMeters != null ? `${out.strideLengthMeters} m` : "not safely expressed in metres"} and body-ratio ${out.strideLengthBodyRatio || "not available"}. Stride frequency is ${out.strideFrequency ? `${out.strideFrequency}/min` : "not defensibly derived from the available temporal samples"}, and speed is ${out.estimatedSpeedKmh ? `${out.estimatedSpeedKmh} km/h` : "withheld rather than estimated from weak data"}. Front reach is ${readMetricValue(out.frontReachAngle)} and rear drive is ${readMetricValue(out.rearDriveAngle)}, so the reach-and-drive profile is reported from the measured limb landmarks rather than a generic breeze-up average. Where the detection confidence is lower, that uncertainty is retained in the report and should be checked against the live breeze and trot-up before valuation is increased.`;
  }
  if (isIncompleteNarrative(out.commercialAnalysis, 4)) {
    out.commercialAnalysis = `The commercial read is ${c.tierProfile.toLowerCase()} on computed biomechanics, with a ${c.racingSuitability.toLowerCase()} racing suitability signal. Buyers should give most weight to the repeatable stride, reach and drive pattern rather than a single eye-catching still image. Low-confidence measurements should be treated as vetting prompts, not as valuation positives. ${c.watchPoints.length ? `Specific watch points before bidding are ${c.watchPoints.join("; ")}.` : "No major computed biomechanical watch point was isolated, so standard scope, limb palpation and trot-up checks remain the appropriate next step."} If the physical inspection confirms the same shoulder freedom, hock use and symmetry seen in the usable frames, the horse can be valued with more confidence; if not, the bid ceiling should stay conservative.`;
  }
  if (isIncompleteNarrative(out.verdict, 4)) {
    out.verdict = `The strongest usable read comes from ${c.bestStrideFrameIndex != null ? `frame ${c.bestStrideFrameIndex + 1}` : "the clearest computed frame"}, where the action is anchored by stride opening at ${readMetricValue(out.limbExtensionAngle)} and front reach at ${readMetricValue(out.frontReachAngle)}. The key positive is the measurable reach-and-drive profile, especially when read alongside hip engagement at ${readMetricValue(out.hipEngagementAngle)} and hock flexion at ${readMetricValue(out.hockFlexion || out.hockAngle)}. The main caution is ${c.watchPoints.length ? c.watchPoints[0] : "that any low-confidence landmark or calibration reading should be checked in the live trot-up and post-breeze inspection"}. Commercially, this should be treated as a ${c.tierProfile.toLowerCase()} profile with ${c.racingSuitability.toLowerCase()} suitability, and the bid should only be pushed if veterinary review confirms the same mechanics outside the still frames.`;
  }
  if (!Array.isArray(out.strengths) || out.strengths.length === 0 || String(out.strengths[0]).match(/uploaded video frames were accepted/i)) {
    out.strengths = [
      `${c.bestStrideFrameIndex != null ? `Frame ${c.bestStrideFrameIndex + 1}` : "The clearest usable frame"} gives a measurable stride reference rather than relying on subjective visual impression.`,
      `Front reach, shoulder expression and hindquarter mechanics were converted into structured values for professional comparison.`,
      `The report separates computed measurements from lower-confidence areas so buyer/vet follow-up can be targeted.`
    ];
  }
  if (!Array.isArray(out.concerns) || out.concerns.length === 0 || String(out.concerns[0]).match(/timed out|retry/i)) {
    out.concerns = c.watchPoints.length
      ? c.watchPoints.map((point) => `${point} — confirm during live inspection and trot-up.`)
      : ["Any low-confidence measurement should be confirmed against live lateral footage, trot-up and veterinary inspection before increasing the valuation."];
  }

  return out;
}