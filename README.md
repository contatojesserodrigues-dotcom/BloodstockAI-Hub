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

Login credentials: set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` (see `.env.example`).

Hub live: [bloodstock-ai-hub.vercel.app](https://bloodstock-ai-hub.vercel.app)

## Platform (agentbloodstockai.com)

```bash
cd platform
npm install
cp .env.example .env   # VITE_SUPABASE_* keys
npm run dev            # http://localhost:8080
```

## Deploy

```bash
# Operations Hub (Next.js)
npx vercel --prod

# Customer platform
cd platform
npx vercel --prod
```

## Supabase edge functions

Deploy from `platform/`:

```bash
npx supabase functions deploy --project-ref <your-project-ref>
```

Set secrets in Supabase dashboard: `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `REVOLUT_API_KEY`, `RESEND_API_KEY`, etc.

## Repository

Canonical remote: `https://github.com/contatojesserodrigues-dotcom/bloodstockai-hub`
