# BloodstockAI Scientific Scoring Engine

Independent Python module for standardized equine inspection scoring.

## Quick start

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt pytest
pytest tests/ -v
```

## FastAPI service

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
uvicorn inspection_ai.api.app:app --host 0.0.0.0 --port 8080 --reload
```

Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe |
| POST | `/v1/score` | Full scientific report JSON |
| POST | `/v1/score/summary` | Compact summary |
| POST | `/v1/validate` | Validate input schema |

Optional env: `SCORING_API_KEY` (Bearer or `X-API-Key` header).

## Supabase edge wrapper

Deploy `inspection-scoring` edge function. Set secrets:

```bash
supabase secrets set \
  SCIENTIFIC_SCORING_ENGINE_URL="https://your-python-service/v1" \
  SCORING_API_KEY="optional-shared-key"
```

When `SCIENTIFIC_SCORING_ENGINE_URL` is unset, the edge function uses the TypeScript adapter (`scientific_scoring.ts`) with **identical weights** from `shared/scoring_constants.json`.

## Python usage

```python
from inspection_ai.scoring import ScientificScoringEngine

engine = ScientificScoringEngine()
report = engine.generate_final_report({
    "horse": {"name": "Lot 145", "category": "FLAT_YEARLING"},
    "biomechanics": {
        "distance_m": 80,
        "stride_count": 10,
        "duration_sec": 5,
        "left_stride_m": 7.8,
        "right_stride_m": 8.2,
    },
    "pedigree": {"sire_performance": 85, "dam_performance": 78},
    "conformation": {"balance": 80, "leg_alignment_deviation_deg": 2},
})
print(report["overall_score"], report["recommendation"])
```

## Formula parity

Single source of truth: [`shared/scoring_constants.json`](../shared/scoring_constants.json)

- Python loads via `inspection_ai/scoring/constants.py`
- TypeScript loads via `_shared/inspection-ai/scoring_constants.json` (keep copies in sync)
- Run `pytest tests/test_parity_constants.py` to verify

## Architecture

- Does **not** replace existing TypeScript edge functions
- Consumes JSON from CV / pedigree / video modules
- Returns structured JSON for frontend & PDF pipeline
- ML-ready: pure functions, deterministic, unit-tested
