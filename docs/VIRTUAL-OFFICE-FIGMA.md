# BloodstockAI Virtual Office — Figma Design Spec

Use this document as the source of truth when building the Figma file. Implementation in React follows this spec at `/office`.

## Visual direction

- **Not** a game, pixel art, or cartoon
- **Is** premium SaaS operations center (Apple, Linear, Notion, Arc)
- Isometric semi-realistic 3D
- Soft lighting, real shadows, glass, light wood, brushed aluminum, natural plants

## Color system (platform-wide)

| Token | Hex | Usage |
|-------|-----|-------|
| `bg/deep` | `#030712` | Page background |
| `surface` | `#0A1628` | Sidebar, panels |
| `card/glass` | `rgba(15,35,65,0.55)` | Cards |
| `border` | `rgba(59,130,246,0.14)` | Borders |
| `accent/blue` | `#2563EB` | Buttons, active |
| `accent/light` | `#3B82F6` | Hover |
| `text` | `#E2E8F0` | Primary text |
| `text/green` | `#4ADE80` | Live labels |
| `card/yellow` | `#EAB308` | Live Activities |
| `card/purple` | `#A855F7` | Agent Status |
| `card/red` | `#EF4444` | Task Flow |

## Departments (15 zones)

Reception, CEO Office, Meeting Room, War Room, Sales, Research, AI Lab, Engineering, Marketing, Operations, Support, Control Center, Coffee Area, Lounge, Server Room.

## React implementation

- Canvas isometric engine at 60 FPS (`src/lib/office3d/`)
- Live sync with Supabase, Claude, n8n, HubSpot, Tavily via `/api/agents`
- Terminal feed shows `[Virtual Office]` events in green
