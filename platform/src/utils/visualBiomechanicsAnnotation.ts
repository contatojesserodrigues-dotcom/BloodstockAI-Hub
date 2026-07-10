// ============================================================
// BloodstockAI® — Visual Analysis Biomechanics Annotation
// Overlays the 7 biomechanical scores onto anatomical zones
// ============================================================

const GOLD = "rgba(255, 200, 70, 1)";
const GOLD_DIM = "rgba(255, 200, 70, 0.95)";
const WHITE = "rgba(255, 255, 255, 1)";
const BG = "rgba(0, 0, 0, 0.92)";
const GREEN = "rgba(60, 220, 90, 1)";
const AMBER = "rgba(255, 190, 50, 1)";
const RED = "rgba(240, 70, 70, 1)";
const SHADOW = "rgba(0, 0, 0, 0.95)";

export interface BiomechanicScores {
  posture?: number;
  forelimb_alignment?: number;
  hindlimb_alignment?: number;
  gait?: number;
  hoof_health?: number;
  health_indicators?: number;
  overall?: number;
}

export interface VisualFrameAnnotation {
  frameIndex: number;
  label: string;
  annotatedDataUrl: string;
}

// ────────────────────────────────────────────────────────────────
// Public legend — rendered below the frames in the UI so the user
// understands exactly what each numbered dot on the horse means.
// ────────────────────────────────────────────────────────────────
export interface BiomechanicLegendItem {
  number: number;
  key: keyof BiomechanicScores;
  title: string;
  anatomy: string;
  what: string;
  why: string;
  scoreGuide: string;
}

export const BIOMECHANIC_LEGEND: BiomechanicLegendItem[] = [
  {
    number: 1,
    key: "health_indicators",
    title: "Health Indicators",
    anatomy: "Head, eye, nostril, neck attachment",
    what: "Coat quality, eye brightness, alertness, nostril dilation and the way the neck ties into the shoulder.",
    why: "These are the first non-invasive signs of overall well-being, hydration and respiratory capacity — a dull eye or pinched nostril is often the earliest red flag a vet would note.",
    scoreGuide: "80+ bright, alert, clean tie-in · 65–79 acceptable, minor concerns · <65 dull, stressed or poor condition.",
  },
  {
    number: 2,
    key: "posture",
    title: "Posture & Topline",
    anatomy: "Withers → back → loin → croup",
    what: "Length, levelness and muscling of the topline; relationship between wither height and croup height.",
    why: "The topline is the engine cover of the athlete. A strong, level topline transmits power from the hindquarters forward efficiently; a dipped or roach back leaks energy and predicts soundness issues under load.",
    scoreGuide: "80+ level, well-muscled, balanced wither/croup · 65–79 minor imbalance · <65 dipped, roached or croup-high.",
  },
  {
    number: 3,
    key: "forelimb_alignment",
    title: "Forelimb Alignment",
    anatomy: "Shoulder → elbow → knee → fetlock → hoof (near foreleg)",
    what: "Straightness of the column, knee set (over/back at the knee), pastern angle and toe direction.",
    why: "The forelimb absorbs ~60% of concussion at gallop. Deviations (offset knees, back-at-the-knee, toed-in/out) concentrate stress on tendons and joints and are the single biggest predictor of forelimb injury.",
    scoreGuide: "80+ straight column, correct angles · 65–79 mild deviation · <65 significant conformation fault.",
  },
  {
    number: 4,
    key: "hindlimb_alignment",
    title: "Hindlimb Alignment",
    anatomy: "Hip → stifle → hock → fetlock → hoof (near hindleg)",
    what: "Angulation of stifle and hock, straightness of the cannon, and whether the hock is sickled, post-legged or correctly set.",
    why: "The hind end is the propulsion source. Correct hock angulation converts muscular drive into stride length; sickle or post-legged conformation reduces power transfer and stresses the suspensory apparatus.",
    scoreGuide: "80+ correct angulation, strong drive line · 65–79 minor sickle/post · <65 marked fault limiting propulsion.",
  },
  {
    number: 5,
    key: "gait",
    title: "Gait & Body Carriage",
    anatomy: "Mid-barrel / centre of mass",
    what: "Symmetry, rhythm, overstep, head carriage and whether the horse tracks straight under itself.",
    why: "An efficient gait reuses elastic energy stride after stride. Asymmetry, short-striding or a hollow frame signal compensation for soreness or weakness elsewhere in the body.",
    scoreGuide: "80+ symmetrical, fluid, good overstep · 65–79 minor irregularity · <65 visible lameness or compensation.",
  },
  {
    number: 6,
    key: "hoof_health",
    title: "Hoof Health",
    anatomy: "Front hoof at ground contact",
    what: "Hoof-pastern axis, heel depth, wall quality, symmetry between feet and overall balance.",
    why: "“No foot, no horse.” Broken-back axes, low heels or mismatched feet are the most common cause of repeat lameness and directly limit a horse's training mileage.",
    scoreGuide: "80+ aligned axis, good heel, matched pair · 65–79 minor imbalance · <65 broken axis or pathology.",
  },
];

function flagColor(score: number): string {
  if (score >= 80) return GREEN;
  if (score >= 65) return AMBER;
  return RED;
}

function drawNumberedPoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  number: number,
  score: number | undefined,
) {
  const ringColor = typeof score === "number" ? flagColor(score) : GOLD;
  // Outer soft halo for visibility on any background
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.arc(x + 1.5, y + 1.5, 16, 0, Math.PI * 2);
  ctx.fill();
  // Dark core
  ctx.fillStyle = BG;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();
  // Coloured ring (flag colour by score)
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.stroke();
  // Number label
  ctx.fillStyle = WHITE;
  ctx.font = "bold 16px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), x, y + 1);
  // Reset baseline
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

function drawHeader(ctx: CanvasRenderingContext2D, w: number, frameIndex: number, overall?: number) {
  const title = `Frame ${frameIndex + 1} — Biomechanical Assessment`;
  ctx.font = "bold 15px Helvetica, Arial, sans-serif";
  const m = ctx.measureText(title);
  const headerW = m.width + 30;
  ctx.fillStyle = BG;
  ctx.fillRect(8, 8, headerW, 36);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, headerW, 36);
  ctx.fillStyle = GOLD;
  ctx.fillText(title, 22, 32);

  // Overall badge top-right
  if (typeof overall === "number") {
    const ot = `OVERALL  ${overall}/100`;
    ctx.font = "bold 15px Helvetica, Arial, sans-serif";
    const om = ctx.measureText(ot);
    const bw = om.width + 30;
    const bx = w - bw - 10;
    ctx.fillStyle = BG;
    ctx.fillRect(bx, 8, bw, 36);
    ctx.strokeStyle = flagColor(overall);
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx, 8, bw, 36);
    ctx.fillStyle = flagColor(overall);
    ctx.fillText(ot, bx + 14, 32);
  }
}

function drawFooter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "rgba(212, 175, 55, 0.35)";
  ctx.font = "bold 10px Helvetica, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("BloodstockAI® — Biomechanical Overlay", w - 10, h - 10);
  ctx.textAlign = "left";
}

function annotate(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  frameIndex: number,
  scores: BiomechanicScores
) {
  const w = canvas.width;
  const h = canvas.height;

  // Stronger vignette for contrast
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(0, 0, w, h);

  // Anatomical anchor points (calibrated for broadside horse, ~centered)
  const cx = w * 0.5;
  const anchors: Record<number, { x: number; y: number }> = {
    1: { x: cx - w * 0.18, y: h * 0.30 }, // Health — head / neck
    2: { x: cx + w * 0.02, y: h * 0.22 }, // Posture — back / withers
    3: { x: cx - w * 0.10, y: h * 0.62 }, // Forelimb
    4: { x: cx + w * 0.16, y: h * 0.62 }, // Hindlimb
    5: { x: cx,            y: h * 0.50 }, // Gait — body centre
    6: { x: cx - w * 0.13, y: h * 0.84 }, // Hoof
  };

  for (const item of BIOMECHANIC_LEGEND) {
    const score = scores[item.key] as number | undefined;
    const a = anchors[item.number];
    if (!a) continue;
    drawNumberedPoint(ctx, a.x, a.y, item.number, score);
  }

  drawHeader(ctx, w, frameIndex, scores.overall);
  drawFooter(ctx, w, h);
}

export async function annotateVisualFrames(
  frameDataUrls: string[],
  scores: BiomechanicScores
): Promise<VisualFrameAnnotation[]> {
  const out: VisualFrameAnnotation[] = [];

  for (let i = 0; i < frameDataUrls.length; i++) {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load frame ${i}`));
      img.src = frameDataUrls[i];
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    ctx.drawImage(img, 0, 0);
    annotate(canvas, ctx, i, scores);

    out.push({
      frameIndex: i,
      label: `Biomechanical Frame ${i + 1}`,
      annotatedDataUrl: canvas.toDataURL("image/jpeg", 0.92),
    });
  }

  return out;
}