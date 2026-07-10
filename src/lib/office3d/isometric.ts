export const TILE_W = 32;
export const TILE_H = 16;

export function toIso(wx: number, wy: number) {
  return {
    x: (wx - wy) * (TILE_W / 2),
    y: (wx + wy) * (TILE_H / 2),
  };
}

export function fromIso(sx: number, sy: number) {
  const wx = (sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2;
  const wy = (sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2;
  return { x: wx, y: wy };
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
