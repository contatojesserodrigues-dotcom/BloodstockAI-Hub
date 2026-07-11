# BloodstockAI Scientific Scoring Engine — Railway deploy

Deploy from **repository root** (not `backend/`):

```bash
railway up -y
```

## Required variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (persistence) |
| `SCORING_API_KEY` | Optional shared secret for edge → API |
| `SCORING_CORS_ORIGINS` | Optional CORS origins (default `*`) |

## Health check

`GET /health`

## Primary endpoint

`POST /api/v1/inspection/score`

After deploy, set Supabase secret:

```bash
supabase secrets set SCIENTIFIC_SCORING_ENGINE_URL=https://your-service.up.railway.app
```
