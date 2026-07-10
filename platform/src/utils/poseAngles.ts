// Shared helpers for the interactive pose viewer.
// Colour-bands match the legend used in the Sale Inspection biomechanics map.

export type Pt = { x: number; y: number };

export type Keypoints = Partial<{
  poll: Pt; muzzle: Pt; withers: Pt; back: Pt; loin: Pt; croup: Pt;
  shoulder: Pt; elbow: Pt; foreKnee: Pt; foreFetlock: Pt; foreHoof: Pt;
  hip: Pt; stifle: Pt; hock: Pt; hindCannon: Pt; hindFetlock: Pt; hindHoof: Pt;
  chest: Pt; belly: Pt;
}>;

export type PoseFrame = {
  index: number;
  timestampMs: number;
  dataUrl: string;
  visible: boolean;
  facing: "left" | "right" | "unknown";
  confidence: number;
  keypoints: Keypoints | null;
  angles: Record<string, number | null>;
  stridePhase: string;
};

/** Bone topology for the skeleton overlay. */
export const BONES: Array<[keyof Keypoints, keyof Keypoints]> = [
  ["poll", "withers"],
  ["withers", "back"], ["back", "loin"], ["loin", "croup"],
  ["withers", "shoulder"], ["shoulder", "chest"],
  ["shoulder", "elbow"], ["elbow", "foreKnee"], ["foreKnee", "foreFetlock"], ["foreFetlock", "foreHoof"],
  ["croup", "hip"], ["hip", "stifle"], ["stifle", "hock"], ["hock", "hindFetlock"], ["hindFetlock", "hindHoof"],
  ["chest", "belly"], ["belly", "hip"],
];

export const JOINT_COLOR = {
  excellent: "#22c55e",
  good:      "#eab308",
  attention: "#f97316",
  poor:      "#ef4444",
} as const;

/** Score-band a joint by how close its measured angle is to its ideal range. */
export function bandColor(joint: string, angle: number | null | undefined): string {
  if (angle == null) return JOINT_COLOR.good;
  const ideal: Record<string, [number, number]> = {
    shoulder: [95, 115],
    elbow:    [140, 160],
    knee:     [165, 180],
    fetlockFront: [140, 165],
    hip:      [85, 110],
    stifle:   [140, 160],
    hock:     [145, 165],
    fetlockHind: [140, 165],
    back:     [165, 180],
    neck:     [110, 140],
  };
  const r = ideal[joint];
  if (!r) return JOINT_COLOR.good;
  const [lo, hi] = r;
  if (angle >= lo && angle <= hi) return JOINT_COLOR.excellent;
  const dev = angle < lo ? lo - angle : angle - hi;
  if (dev <= 8) return JOINT_COLOR.good;
  if (dev <= 18) return JOINT_COLOR.attention;
  return JOINT_COLOR.poor;
}

/** Map each anatomical keypoint to its governing angle for colouring. */
export const POINT_ANGLE: Record<string, string> = {
  shoulder: "shoulder", elbow: "elbow", foreKnee: "knee", foreFetlock: "fetlockFront", foreHoof: "fetlockFront",
  hip: "hip", stifle: "stifle", hock: "hock", hindFetlock: "fetlockHind", hindHoof: "fetlockHind",
  withers: "back", back: "back", loin: "back", croup: "back",
  poll: "neck",
};