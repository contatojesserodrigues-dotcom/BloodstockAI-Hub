# BloodstockAI Inspection API

Python is the **single source of truth** for all scientific scoring formulas.

## Architecture

```
Frontend (React)
    → inspection-scoring (Supabase Edge — auth proxy only)
    → FastAPI POST /api/v1/inspection/score
    → ScientificScoringEngine (Python)
    → JSON + Supabase persistence
    → Dashboard / PDF
```

## Clean Architecture layers

| Layer | Path |
|-------|------|
| Routers | `inspection_ai/api/routers/` |
| Services | `inspection_ai/application/` |
| Domain (versioning) | `inspection_ai/domain/` |
| Scoring formulas | `inspection_ai/scoring/` |
| Repositories | `inspection_ai/infrastructure/repositories/` |
| Feature extraction (CV stub) | `inspection_ai/feature_extraction/` |

## Run API

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...  # optional persistence
uvicorn inspection_ai.api.main:app --host 0.0.0.0 --port 8080 --reload
```

## Primary endpoint

`POST /api/v1/inspection/score`

```json
{
  "inspection_id": "uuid",
  "horse": {},
  "pedigree": {},
  "biomechanics": {},
  "conformation": {},
  "behaviour": {},
  "hoof": {},
  "persist": true
}
```

Response includes `overall_score`, `elite_potential`, `confidence`, module scores, `recommendations`, and `scientific_version`.

## Scientific versioning

Every run persists:

- `scientific_version.engine` — e.g. `1.0.0`
- Module versions: biomechanics, pedigree, conformation, behaviour, hoof, prediction
- `scored_at` ISO timestamp

Stored in `inspection_scoring_runs` + `inspection_analyses.scientific_version_json`.

## Tests

```bash
pytest tests/ -v
```

## Deploy

1. Deploy FastAPI (Railway, Fly.io, etc.)
2. Set Supabase secrets:
   ```bash
   supabase secrets set SCIENTIFIC_SCORING_ENGINE_URL=https://your-api SCORING_API_KEY=...
   supabase functions deploy inspection-scoring inspection-engine
   ```
3. Apply migration `20260711140000_scientific_scoring_persistence.sql`

## Rules

- **Never** duplicate scoring formulas in TypeScript or frontend
- TypeScript edge functions: auth, data loading, proxy only
- Frontend: send `inspection_id`, render JSON
