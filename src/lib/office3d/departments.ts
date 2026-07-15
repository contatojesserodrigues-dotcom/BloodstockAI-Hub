export interface DepartmentZone {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floor: string;
  accent: string;
  furniture: ("desk" | "monitor" | "chair" | "plant" | "glass" | "sofa" | "server" | "board")[];
}

export const DEPARTMENTS: DepartmentZone[] = [
  { id: "reception", label: "Reception", x: 2, y: 2, w: 10, h: 6, floor: "#1E3A5F", accent: "#3B82F6", furniture: ["desk", "plant", "glass"] },
  { id: "ceo", label: "CEO Office", x: 14, y: 2, w: 8, h: 6, floor: "#1a2744", accent: "#6366F1", furniture: ["desk", "monitor", "chair", "plant"] },
  { id: "meeting", label: "Meeting Room", x: 24, y: 2, w: 10, h: 7, floor: "#152238", accent: "#60A5FA", furniture: ["board", "chair", "glass", "monitor"] },
  { id: "war", label: "War Room", x: 36, y: 2, w: 8, h: 6, floor: "#111827", accent: "#EF4444", furniture: ["board", "monitor", "server"] },
  { id: "sales", label: "Sales Department", x: 2, y: 10, w: 12, h: 8, floor: "#1a2f4d", accent: "#2563EB", furniture: ["desk", "monitor", "chair", "desk", "monitor"] },
  { id: "research", label: "Research Department", x: 16, y: 10, w: 10, h: 8, floor: "#162a45", accent: "#38BDF8", furniture: ["desk", "monitor", "plant", "chair"] },
  { id: "ai-lab", label: "AI Lab", x: 28, y: 10, w: 8, h: 8, floor: "#0f2038", accent: "#818CF8", furniture: ["server", "monitor", "desk"] },
  { id: "engineering", label: "Engineering", x: 38, y: 10, w: 10, h: 8, floor: "#14263f", accent: "#22D3EE", furniture: ["desk", "monitor", "monitor", "monitor", "chair"] },
  { id: "marketing", label: "Marketing", x: 2, y: 20, w: 10, h: 7, floor: "#1a2842", accent: "#A855F7", furniture: ["desk", "monitor", "plant", "chair"] },
  { id: "operations", label: "Operations", x: 14, y: 20, w: 10, h: 7, floor: "#152238", accent: "#64748B", furniture: ["desk", "board", "monitor"] },
  { id: "support", label: "Support", x: 26, y: 20, w: 8, h: 7, floor: "#16263f", accent: "#34D399", furniture: ["desk", "chair", "monitor"] },
  { id: "control", label: "Control Center", x: 36, y: 20, w: 12, h: 7, floor: "#0c1a30", accent: "#F59E0B", furniture: ["monitor", "server", "board"] },
  { id: "coffee", label: "Coffee Area", x: 2, y: 29, w: 8, h: 5, floor: "#1c2f48", accent: "#D97706", furniture: ["sofa", "plant"] },
  { id: "lounge", label: "Lounge", x: 12, y: 29, w: 12, h: 6, floor: "#182840", accent: "#94A3B8", furniture: ["sofa", "plant", "plant"] },
  { id: "server", label: "Server Room", x: 26, y: 29, w: 10, h: 6, floor: "#0a1525", accent: "#06B6D4", furniture: ["server", "server", "glass"] },
];

export const ROOM_TO_DEPT: Record<string, string> = {
  sales: "sales",
  research: "research",
  crm: "operations",
  email: "marketing",
  copy: "marketing",
  success: "support",
  partnerships: "sales",
  market: "research",
  social: "marketing",
  product: "engineering",
  boardroom: "meeting",
  ceo: "ceo",
  revenue: "sales",
};

export function departmentForRoom(room: string) {
  return DEPARTMENTS.find((d) => d.id === (ROOM_TO_DEPT[room] || "operations")) || DEPARTMENTS[0];
}

export function waypointInDepartment(deptId: string, seed: number) {
  const dept = DEPARTMENTS.find((d) => d.id === deptId) || DEPARTMENTS[0];
  const ox = (seed % 5) * 1.2;
  const oy = (Math.floor(seed / 5) % 4) * 1.1;
  return {
    x: dept.x + 2 + ox,
    y: dept.y + 2 + oy,
    dept,
  };
}
