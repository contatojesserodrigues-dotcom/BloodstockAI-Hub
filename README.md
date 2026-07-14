# BloodstockAI Platform

Customer-facing BloodstockAI application — Vite + React + Supabase.

**Website:** https://www.agentbloodstockai.com

## Quick Start

```bash
cd platform
npm install
cp .env.example .env   # configure Supabase keys
npm run dev            # http://localhost:8080
```

## Repository structure

| Path | Description |
|------|-------------|
| `platform/` | Production frontend (Vite + React + Supabase edge functions) |
| `backend/` | Python inspection / scoring engine (Railway) |
| `shared/` | Shared scoring constants |
| `docs/` | Supabase SQL and inspection integration notes |

## Deploy

- **Frontend:** `cd platform && npx vercel --prod`
- **Backend:** see `backend/RAILWAY.md`

See `platform/README.md` for full platform documentation.
