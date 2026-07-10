// BloodstockAI commercial sire tier map.
// Tiers: "elite" (35), "strong" (25), "solid" (15), "neutral" (8 — assigned when sire is unknown).
// Keep names UPPERCASE for matching.
export type SireTier = "elite" | "strong" | "solid" | "neutral";

export const SIRE_TIER_MAP: Record<string, SireTier> = {
  // Elite global stallions
  "FRANKEL": "elite",
  "DUBAWI": "elite",
  "GALILEO": "elite",
  "KINGMAN": "elite",
  "SEA THE STARS": "elite",
  "WOOTTON BASSETT": "elite",
  "SIYOUNI": "elite",
  "NO NAY NEVER": "elite",
  "JUSTIFY": "elite",
  "INTO MISCHIEF": "elite",
  "AMERICAN PHAROAH": "elite",
  "TAPIT": "elite",
  "CURLIN": "elite",
  "QUALITY ROAD": "elite",
  "GUN RUNNER": "elite",
  "MEDAGLIA D'ORO": "elite",
  "WAR FRONT": "elite",
  "DEEP IMPACT": "elite",
  "LOPE DE VEGA": "elite",
  "DARK ANGEL": "elite",
  "INVINCIBLE SPIRIT": "elite",
  // Strong commercial
  "TOO DARN HOT": "strong",
  "BLUE POINT": "strong",
  "STARSPANGLEDBANNER": "strong",
  "MEHMAS": "strong",
  "HAVANA GREY": "strong",
  "ZOUSTAR": "strong",
  "TERRITORIES": "strong",
  "NEW BAY": "strong",
  "CARAVAGGIO": "strong",
  "TWILIGHT SON": "strong",
  "PRACTICAL JOKE": "strong",
  "NYQUIST": "strong",
  "UNCLE MO": "strong",
  "CONSTITUTION": "strong",
  "GHOSTZAPPER": "strong",
  "MUNNINGS": "strong",
  // Solid regional
  "SHOWCASING": "solid",
  "BATED BREATH": "solid",
  "EXCEED AND EXCEL": "solid",
  "ACCLAMATION": "solid",
  "OASIS DREAM": "solid",
  "AUTHORIZED": "solid",
  "PROFITABLE": "solid",
  "ULYSSES": "solid",
  "PINATUBO": "solid",
  "EARTHLIGHT": "solid",
  "PALACE MALICE": "solid",
  "MITOLE": "solid",
  "OMAHA BEACH": "solid",
  "MAXIMUS MISCHIEF": "solid",
};

export function lookupSireTier(name?: string | null): SireTier {
  if (!name) return "neutral";
  const key = name.trim().toUpperCase();
  return SIRE_TIER_MAP[key] ?? "neutral";
}

export const SIRE_TIER_POINTS: Record<SireTier, number> = {
  elite: 35,
  strong: 25,
  solid: 15,
  neutral: 8,
};