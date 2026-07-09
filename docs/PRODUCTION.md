# BloodstockAI Operations Hub — Initial Production

## Architecture (Production)

| Layer | Service |
|-------|---------|
| Frontend | Next.js 15 on Vercel |
| Database & state | Supabase (agents, logs, approvals, leads) |
| Reasoning | Claude (Anthropic API) |
| Web research | Tavily |
| CRM | HubSpot |
| Automation | n8n (Gmail, Calendar — approval-gated) |
| Local fallback | Prisma/SQLite (dev only) |

Production does **not** require SQLite. Supabase is the primary backend.

---

## 1. Supabase setup

1. Open [Supabase SQL Editor](https://supabase.com/dashboard)
2. Run `docs/supabase-migration.sql`
3. Seed agents locally:

```bash
npm run db:supabase-seed
```

---

## 2. Vercel deploy

### Connect repository

```bash
git push -u origin main
```

Then: [vercel.com/new](https://vercel.com/new) → Import **bloodstockai-hub**

### Required environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `HUB_URL` | Same as above |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |
| `ADMIN_SESSION_SECRET` | Random 32+ char secret |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — never expose |
| `ANTHROPIC_API_KEY` | Claude reasoning & copy |
| `TAVILY_API_KEY` | Web research |
| `N8N_AGENT_WEBHOOK_URL` | `https://bloodstockai.app.n8n.cloud/webhook/agent-command` |
| `N8N_BASE_URL` | `https://bloodstockai.app.n8n.cloud` |

### Optional

| Variable | Description |
|----------|-------------|
| `HUBSPOT_ACCESS_TOKEN` | CRM sync |
| `N8N_WEBHOOK_SECRET` | Webhook auth |
| `ANTHROPIC_MODEL` | Default: `claude-sonnet-4-20250514` |

### Do NOT set on Vercel

- `DATABASE_URL=file:./dev.db` — SQLite does not work on Vercel
- `SUPABASE_SERVICE_ROLE_KEY` in any `NEXT_PUBLIC_*` variable

---

## 3. Post-deploy checklist

- [ ] Login at `/login`
- [ ] Dashboard shows 14 official agents
- [ ] Command: `James, find 10 UK consignors using Tavily`
- [ ] Terminal logs update
- [ ] Approval cards created (pending)
- [ ] Approve → n8n webhook fires
- [ ] Update n8n `HUB_URL` to Vercel URL

---

## 4. Official agents (14)

James Carter, Emma Collins, Oliver Brooks, Sophia Bennett, Olivia Sterling, Ethan Walker, Isabella Morgan, Victoria Green, Liam Foster, Charlotte Hughes, Noah Richardson, Amelia Scott, Evelyn Stone, Alexander Knight

---

## 5. Custom domain

In Vercel → Settings → Domains → add `www.agentbloodstockai.com`

Update `NEXT_PUBLIC_APP_URL` and `HUB_URL` to the production domain.
