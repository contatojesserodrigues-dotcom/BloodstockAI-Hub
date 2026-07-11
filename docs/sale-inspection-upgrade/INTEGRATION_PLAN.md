# Sale Inspection Analysis — Integration Plan

**Principle:** Upgrade intelligence behind existing UI. No layout/design changes.

## Current flow (preserved)

`DashboardVisualAnalysis` → edge functions → DB → existing panels render JSON.

## Target pipeline

```
Upload PDF     → pedigree extract + meta → Tavily research → Pedigree Intelligence → Score
Upload media   → vision blocks           → Feature extract  → Score
Upload video   → pose frames            → Biomechanics     → Score
Research done  → Market Estimate        → Score refresh
All modules    → Unified JSON bundle    → PDF sections
```

## Module map

| Module | Location | Responsibility |
|--------|----------|----------------|
| Pedigree PDF Engine | `inspection-pedigree-insight` + `pedigree_engine/` | OCR/extract structured meta |
| Internet Research | `research_queries.ts` + `inspection-pedigree-research` | Tavily parallel queries |
| Pedigree Intelligence | `pedigree_engine/intelligence_scorer.py` | Dynamic score from research |
| Scientific Scoring | `scoring/` (Python SSOT) | All formula scores |
| Market Estimate | `market_engine/estimate.py` | Commercial valuation |
| Report Engine | `report_engine/aggregator.py` | Unified JSON for PDF |
| Orchestrator | `_shared/inspection-ai/pipeline.ts` | Progress + async triggers |

## DB additions

- `processing_step`, `processing_progress` on `inspection_analyses`
- `intelligence_bundle` jsonb — unified `{pedigree, market, scores, ...}`
- `inspection_pedigree_analysis` — normalized extraction rows

## Frontend (data only)

- `useInspectionProgress` — Realtime/poll refresh, no UI changes
- Panels read `market_estimate`, `intelligence_scores` from DB (server-first)

## Versioning

All runs stamped with `scientific_version_json` + module versions in `domain/versioning.py`.
