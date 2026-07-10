# BloodstockAI Scientific Scoring Engine

Independent Python module for standardized equine inspection scoring.

## Quick start

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt pytest
pytest tests/ -v
```

## Usage

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
        "hock_extension_deg": 150,
        "shoulder_rom_deg": 32,
    },
    "pedigree": {"sire_performance": 85, "dam_performance": 78, "black_type_score": 72},
    "conformation": {"balance": 80, "leg_alignment_deviation_deg": 2},
})
print(report["overall_score"], report["recommendation"])
```

## Architecture

- Does **not** replace existing TypeScript edge functions
- Consumes JSON from CV / pedigree / video modules
- Returns structured JSON for frontend & PDF pipeline
- ML-ready: pure functions, deterministic, unit-tested
