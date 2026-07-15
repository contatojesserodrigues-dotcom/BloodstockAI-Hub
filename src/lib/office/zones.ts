export interface OfficePoint {
  x: number;
  y: number;
  label?: string;
}

export const OFFICE_ZONES: Record<string, OfficePoint[]> = {
  sales: [
    { x: 14, y: 38, label: "Sales Desk A" },
    { x: 20, y: 42, label: "Sales Desk B" },
    { x: 17, y: 48 },
  ],
  research: [
    { x: 32, y: 28, label: "Research Station" },
    { x: 38, y: 32 },
    { x: 35, y: 36 },
  ],
  crm: [
    { x: 28, y: 52, label: "CRM Hub" },
    { x: 33, y: 56 },
  ],
  email: [
    { x: 42, y: 48, label: "Email Studio" },
    { x: 46, y: 52 },
  ],
  copy: [
    { x: 48, y: 38, label: "Copy Desk" },
    { x: 52, y: 42 },
  ],
  success: [
    { x: 58, y: 52, label: "Success Lounge" },
    { x: 62, y: 56 },
  ],
  partnerships: [
    { x: 66, y: 32, label: "Partnerships" },
    { x: 70, y: 36 },
  ],
  market: [
    { x: 24, y: 22, label: "Intel Wall" },
    { x: 30, y: 18 },
  ],
  social: [
    { x: 72, y: 48, label: "Social Studio" },
    { x: 76, y: 52 },
  ],
  product: [
    { x: 78, y: 28, label: "Product Lab" },
    { x: 82, y: 32 },
  ],
  boardroom: [
    { x: 52, y: 28, label: "Board Table" },
    { x: 56, y: 30 },
    { x: 54, y: 32 },
  ],
  ceo: [
    { x: 60, y: 22, label: "CEO Suite" },
    { x: 64, y: 24 },
  ],
  revenue: [
    { x: 44, y: 22, label: "Revenue Desk" },
    { x: 48, y: 26 },
  ],
  meeting: [
    { x: 54, y: 34, label: "Meeting Room" },
    { x: 58, y: 36 },
    { x: 56, y: 38 },
  ],
  lounge: [
    { x: 68, y: 62, label: "Lounge Sofa" },
    { x: 74, y: 66 },
    { x: 70, y: 70 },
  ],
  corridor: [
    { x: 40, y: 44 },
    { x: 50, y: 46 },
    { x: 60, y: 44 },
    { x: 50, y: 58 },
  ],
};

const STATUS_ZONE: Record<string, string> = {
  RESEARCHING: "research",
  MONITORING: "market",
  UPDATING_CRM: "crm",
  WAITING_APPROVAL: "email",
  WRITING: "copy",
  ANALYZING: "revenue",
  COMPLETED: "boardroom",
  SENDING_APPROVED: "email",
  IDLE: "lounge",
};

export function zoneForAgent(room: string, status: string): string {
  const normalized = status.toUpperCase().replace(/-/g, "_");
  if (normalized === "IDLE") return room || "lounge";
  return STATUS_ZONE[normalized] || room || "corridor";
}

export function pickWaypoint(zoneKey: string, seed: number): OfficePoint {
  const zone = OFFICE_ZONES[zoneKey] || OFFICE_ZONES.corridor;
  return zone[seed % zone.length];
}
