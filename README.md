# BloodstockAI Agent Virtual HUB Center

Premium AI operations dashboard for monitoring and controlling BloodstockAI agents in real time.

**Website:** www.agentbloodstockai.com  
**Email:** office@agentbloodstockai.com  
**Last deployed:** 2026-07-10T00:06:00+01:00

## Quick Start

```bash
cd ~/Projects/bloodstockai-hub
npm install
npm run db:setup
npm run dev
```

Open http://localhost:3000

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Command center |
| `/office` | Virtual office map with 11 rooms |
| `/agents` | All 12 AI agents |
| `/agents/[id]` | Agent profile, chat, logs |
| `/terminal` | Live activity terminal |
| `/approvals` | Human approval queue |
| `/crm` | Pipeline dashboard |
| `/campaigns` | Email campaigns |
| `/leads` | Lead database |
| `/meetings` | Calendar |
| `/ceo` | Evelyn Stone executive dashboard |
| `/settings/integrations` | API connections |

## Agents

James Carter, Emma Collins, Oliver Brooks, Sophia Bennett, Ethan Walker, Isabella Morgan, Victoria Green, Liam Foster, Charlotte Hughes, Noah Richardson, Amelia Scott, Evelyn Stone

## First Workflow

On the dashboard, click **Run Workflow** to simulate:
Find 50 UK/Ireland consignors -> Research -> CRM -> Email drafts -> Approval queue -> CEO summary

## Environment Variables

Never hardcode secrets. Use `.env`:

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
PERPLEXITY_API_KEY=
HUBSPOT_API_KEY=
APOLLO_API_KEY=
CLAY_API_KEY=
GMAIL_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_ID=
FIGMA_API_KEY=
GITHUB_API_KEY=
BLOODSTOCKAI_API_KEY=

# n8n Cloud
N8N_BASE_URL=https://bloodstockai.app.n8n.cloud
N8N_WEBHOOK_AGENT=/webhook/agent-command
N8N_WEBHOOK_WORKFLOW=/webhook/consignor-workflow
N8N_WEBHOOK_SEND_APPROVED=/webhook/send-approved-emails
```

## n8n Automation

Full guide: **`docs/n8n-workflows.md`**

Import templates from **`n8n/`** into https://bloodstockai.app.n8n.cloud/

## Design System

See `design-system/FIGMA.md` for Figma-ready tokens and component specs.

## Deploy (GitHub + Vercel)

### 1. Push to GitHub

```bash
cd ~/Projects/bloodstockai-hub
git add .
git commit -m "BloodstockAI Hub - initial release"
git remote add origin https://github.com/SEU-USUARIO/bloodstockai-hub.git
git branch -M main
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and click **Add New Project**
2. Connect your GitHub account and select **BloodstockAI Hub**
3. Add these **Environment Variables** (Production):

| Variable | Value |
|----------|-------|
| `N8N_AGENT_WEBHOOK_URL` | `https://bloodstockai.app.n8n.cloud/webhook/agent-command` |
| `N8N_BASE_URL` | `https://bloodstockai.app.n8n.cloud` |
| `DATABASE_URL` | PostgreSQL URL (Neon or Vercel Postgres — SQLite does not work on Vercel) |
| `ADMIN_EMAIL` | Your admin email |
| `ADMIN_PASSWORD` | Your admin password |
| `ADMIN_SESSION_SECRET` | Random secret string |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `HUB_URL` | Same as `NEXT_PUBLIC_APP_URL` |

4. Click **Deploy**

After deploy, run migrations against your production database:

```bash
DATABASE_URL="your-postgres-url" npx prisma db push
DATABASE_URL="your-postgres-url" npm run db:seed
```

Update `HUB_URL` in n8n Cloud variables to your Vercel URL.

## Stack

Next.js 15, TypeScript, Tailwind CSS 4, Framer Motion, Prisma, SQLite, Zustand, Recharts
