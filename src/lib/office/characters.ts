export type HairStyle = "short" | "curly" | "long" | "bun" | "fade" | "bob";

export interface AgentCharacterStyle {
  slug: string;
  hairColor: string;
  hairStyle: HairStyle;
  skinTone: string;
  shirtColor: string;
  pantsColor: string;
  accentColor: string;
  accessory?: "glasses" | "headset" | "tie" | "badge";
}

export const AGENT_CHARACTERS: Record<string, AgentCharacterStyle> = {
  "james-carter": {
    slug: "james-carter",
    hairColor: "#2C1810",
    hairStyle: "short",
    skinTone: "#D4A574",
    shirtColor: "#8B1538",
    pantsColor: "#1E293B",
    accentColor: "#8B1538",
    accessory: "tie",
  },
  "emma-collins": {
    slug: "emma-collins",
    hairColor: "#5C3D2E",
    hairStyle: "bob",
    skinTone: "#F5D0A9",
    shirtColor: "#1E3A5F",
    pantsColor: "#334155",
    accentColor: "#3B82F6",
    accessory: "glasses",
  },
  "oliver-brooks": {
    slug: "oliver-brooks",
    hairColor: "#1F2937",
    hairStyle: "fade",
    skinTone: "#C68642",
    shirtColor: "#FF7A59",
    pantsColor: "#0F172A",
    accentColor: "#FF7A59",
    accessory: "headset",
  },
  "sophia-bennett": {
    slug: "sophia-bennett",
    hairColor: "#4A044E",
    hairStyle: "long",
    skinTone: "#FDDBB4",
    shirtColor: "#6B21A8",
    pantsColor: "#312E81",
    accentColor: "#A855F7",
  },
  "olivia-sterling": {
    slug: "olivia-sterling",
    hairColor: "#78350F",
    hairStyle: "bun",
    skinTone: "#FFE4C4",
    shirtColor: "#9333EA",
    pantsColor: "#4C1D95",
    accentColor: "#C084FC",
    accessory: "glasses",
  },
  "ethan-walker": {
    slug: "ethan-walker",
    hairColor: "#292524",
    hairStyle: "short",
    skinTone: "#B87A4A",
    shirtColor: "#0D9488",
    pantsColor: "#134E4A",
    accentColor: "#2DD4BF",
    accessory: "tie",
  },
  "isabella-morgan": {
    slug: "isabella-morgan",
    hairColor: "#881337",
    hairStyle: "long",
    skinTone: "#F9D5BB",
    shirtColor: "#DB2777",
    pantsColor: "#831843",
    accentColor: "#F472B6",
  },
  "victoria-green": {
    slug: "victoria-green",
    hairColor: "#14532D",
    hairStyle: "curly",
    skinTone: "#E8B88A",
    shirtColor: "#059669",
    pantsColor: "#064E3B",
    accentColor: "#34D399",
    accessory: "badge",
  },
  "liam-foster": {
    slug: "liam-foster",
    hairColor: "#713F12",
    hairStyle: "short",
    skinTone: "#D4A574",
    shirtColor: "#CA8A04",
    pantsColor: "#422006",
    accentColor: "#FACC15",
    accessory: "glasses",
  },
  "charlotte-hughes": {
    slug: "charlotte-hughes",
    hairColor: "#9F1239",
    hairStyle: "bob",
    skinTone: "#FFE0BD",
    shirtColor: "#E11D48",
    pantsColor: "#881337",
    accentColor: "#FB7185",
  },
  "noah-richardson": {
    slug: "noah-richardson",
    hairColor: "#1E1B4B",
    hairStyle: "fade",
    skinTone: "#C68642",
    shirtColor: "#4F46E5",
    pantsColor: "#1E1B4B",
    accentColor: "#818CF8",
    accessory: "headset",
  },
  "amelia-scott": {
    slug: "amelia-scott",
    hairColor: "#374151",
    hairStyle: "bun",
    skinTone: "#FDDBB4",
    shirtColor: "#475569",
    pantsColor: "#1E293B",
    accentColor: "#94A3B8",
    accessory: "badge",
  },
  "evelyn-stone": {
    slug: "evelyn-stone",
    hairColor: "#450A0A",
    hairStyle: "long",
    skinTone: "#F5D0A9",
    shirtColor: "#7F1D1D",
    pantsColor: "#450A0A",
    accentColor: "#DC2626",
    accessory: "tie",
  },
  "alexander-knight": {
    slug: "alexander-knight",
    hairColor: "#1C1917",
    hairStyle: "short",
    skinTone: "#B87A4A",
    shirtColor: "#B45309",
    pantsColor: "#292524",
    accentColor: "#F59E0B",
    accessory: "tie",
  },
};

export function getCharacterStyle(slug: string, fallbackColor: string): AgentCharacterStyle {
  return (
    AGENT_CHARACTERS[slug] || {
      slug,
      hairColor: "#374151",
      hairStyle: "short",
      skinTone: "#D4A574",
      shirtColor: fallbackColor,
      pantsColor: "#1E293B",
      accentColor: fallbackColor,
    }
  );
}
