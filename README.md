# BloodstockAI Platform

Production frontend for [agentbloodstockai.com](https://www.agentbloodstockai.com) — Vite + React + Supabase.

## Agent Virtual Office (Operations Hub)

The **Virtual Office** (`/office`) and full AI operations hub have been restored from git history.

```bash
# From repo root — Next.js hub (port 3000)
npm install
npm run db:setup
npm run dev
```

| Route | Description |
|-------|-------------|
| `/office` | Virtual Office — room cards with 14 AI agents |
| `/dashboard` | Command center |
| `/terminal` | Live activity terminal |
| `/agents` | All agents |

Login: `admin@bloodstockai.com` / `BloodstockAI2026!`

## Platform (agentbloodstockai.com)

```bash
cd platform
npm install
cp .env.example .env   # VITE_SUPABASE_* keys (project uzkicvizgezitiyhihcq)
npm run dev            # http://localhost:8080
```

## Deploy

```bash
cd platform
npx vercel --prod
```

## Supabase edge functions

Deploy from `platform/`:

```bash
npx supabase functions deploy --project-ref uzkicvizgezitiyhihcq
```

Set secrets in Supabase dashboard: `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `REVOLUT_API_KEY`, `RESEND_API_KEY`, etc.

## Repository

Canonical remote: `https://github.com/contatojesserodrigues-dotcom/agentbloodstockai`
