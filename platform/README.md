# BloodstockAI Platform

Customer-facing BloodstockAI application — Vite + React + Supabase.

## Setup

```bash
cd platform
npm install
cp .env.example .env   # configure Supabase keys
npm run dev            # http://localhost:8080
```

## Structure

- `src/pages/` — routes (homepage at `Index.tsx`)
- `src/components/landing/` — premium landing page sections
- `src/components/dashboard/` — authenticated product features
- `supabase/` — edge functions and migrations

## Design preview (local — not production domain)

```bash
cd platform
npm install
npm run dev:design
```

| URL | Use |
|-----|-----|
| http://localhost:3099/ | Homepage on this machine |
| http://127.0.0.1:3099/ | Same, if localhost fails |
| http://YOUR_LAN_IP:3099/ | Phone/tablet on same Wi‑Fi (e.g. `192.168.1.27:3099`) |

Inspection showcase (scroll or `#inspection-showcase`):
- **Motion Mapping** — real product screenshot
- **Conformation** — skeleton overlay + measurements
- **Market Estimate & ROI** — tiers + ROI chart
- **Breeze-Up / Training** — gallop analysis + stride charts

Assets live in `public/landing/`.

## Figma Design

Premium landing page design file:
https://www.figma.com/design/42M0lDfTjKKX0hcPrg5MVk/BloodstockAI-Premium-Landing-Page
