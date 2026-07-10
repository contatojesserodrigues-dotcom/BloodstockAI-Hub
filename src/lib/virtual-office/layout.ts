export interface RoomDef {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floor: string;
  type: "office" | "meeting" | "lounge" | "utility" | "corridor";
}

export const ROOMS: RoomDef[] = [
  { id: "reception", label: "Reception", x: 40, y: 20, w: 120, h: 70, floor: "#1E2433", type: "office" },
  { id: "ceo", label: "CEO Office", x: 180, y: 20, w: 100, h: 70, floor: "#1A2030", type: "office" },
  { id: "sales", label: "Sales", x: 300, y: 20, w: 130, h: 80, floor: "#1C2434", type: "office" },
  { id: "research", label: "Research", x: 450, y: 20, w: 120, h: 80, floor: "#1A2232", type: "office" },
  { id: "marketing", label: "Marketing", x: 590, y: 20, w: 110, h: 80, floor: "#1D2535", type: "office" },
  { id: "engineering", label: "Engineering", x: 720, y: 20, w: 130, h: 80, floor: "#181F2E", type: "office" },
  { id: "ai-lab", label: "AI Lab", x: 870, y: 20, w: 100, h: 80, floor: "#151C2B", type: "office" },
  { id: "meeting", label: "Meeting Room", x: 300, y: 120, w: 140, h: 90, floor: "#1B2333", type: "meeting" },
  { id: "training", label: "Training Room", x: 460, y: 120, w: 110, h: 90, floor: "#1A2131", type: "meeting" },
  { id: "operations", label: "Operations", x: 590, y: 120, w: 120, h: 90, floor: "#1C2434", type: "office" },
  { id: "finance", label: "Finance", x: 730, y: 120, w: 100, h: 90, floor: "#1A2130", type: "office" },
  { id: "support", label: "Support", x: 850, y: 120, w: 120, h: 90, floor: "#1B2332", type: "office" },
  { id: "kitchen", label: "Kitchen", x: 40, y: 110, w: 80, h: 60, floor: "#1E2535", type: "lounge" },
  { id: "coffee", label: "Coffee Area", x: 140, y: 110, w: 90, h: 60, floor: "#1D2434", type: "lounge" },
  { id: "lounge", label: "Lounge", x: 40, y: 190, w: 190, h: 80, floor: "#1A2130", type: "lounge" },
  { id: "server", label: "Server Room", x: 870, y: 120, w: 100, h: 90, floor: "#121820", type: "utility" },
  { id: "hall-h", label: "Main Hallway", x: 250, y: 100, w: 640, h: 12, floor: "#222A3A", type: "corridor" },
  { id: "hall-v", label: "Corridor", x: 270, y: 20, w: 12, h: 250, floor: "#222A3A", type: "corridor" },
];

export const ROOM_BY_AGENT: Record<string, string> = {
  "james-carter": "sales",
  "ethan-walker": "sales",
  "emma-collins": "research",
  "liam-foster": "research",
  "oliver-brooks": "engineering",
  "noah-richardson": "engineering",
  "sophia-bennett": "marketing",
  "olivia-sterling": "marketing",
  "charlotte-hughes": "marketing",
  "victoria-green": "sales",
  "isabella-morgan": "support",
  "amelia-scott": "operations",
  "evelyn-stone": "ceo",
  "alexander-knight": "finance",
};

export const WORKFLOW_CHAIN = [
  "james-carter",
  "emma-collins",
  "oliver-brooks",
  "sophia-bennett",
  "olivia-sterling",
  "evelyn-stone",
  "amelia-scott",
] as const;

export function roomForAgent(slug: string, status: string): string {
  const s = status.toUpperCase().replace(/-/g, "_");
  if (s === "WAITING_APPROVAL") return "meeting";
  if (s === "IDLE") return "lounge";
  if (s === "COMPLETED") return "operations";
  return ROOM_BY_AGENT[slug] || "operations";
}

export function deskPoint(roomId: string, seed: number) {
  const room = ROOMS.find((r) => r.id === roomId) || ROOMS[0];
  const col = seed % 3;
  const row = Math.floor(seed / 3) % 2;
  return {
    x: room.x + 24 + col * 36,
    y: room.y + 28 + row * 28,
    room,
  };
}
