#!/usr/bin/env bash
# One-shot: create Sale Inspection schema + deploy edge functions on Supabase uzkicvizgezitiyhihcq
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="uzkicvizgezitiyhihcq"
export PATH="/Users/jesserodrigues/atom-ai-works/.tools/node-v22.14.0-darwin-x64/bin:$PATH"

echo "==> BloodstockAI — Supabase Inspection Setup"
echo "Project: ${PROJECT_REF}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: Missing SUPABASE_ACCESS_TOKEN"
  echo "Get one at: https://supabase.com/dashboard/account/tokens"
  echo "Then run: export SUPABASE_ACCESS_TOKEN=sbp_..."
  exit 1
fi

echo "==> Linking project..."
if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  npx --yes supabase@2.109.1 link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
else
  npx --yes supabase@2.109.1 link --project-ref "$PROJECT_REF"
fi

if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  DB_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
  echo "==> Pushing all migrations (direct DB)..."
  npx --yes supabase@2.109.1 db push --db-url "$DB_URL" --yes
else
  echo "==> Pushing all migrations (linked)..."
  npx --yes supabase@2.109.1 db push --yes
fi

echo "==> Setting secrets..."
npx --yes supabase@2.109.1 secrets set \
  SCIENTIFIC_SCORING_ENGINE_URL="${SCIENTIFIC_SCORING_ENGINE_URL:-https://bloodstockai-hub-production.up.railway.app}" \
  --project-ref "$PROJECT_REF"

echo "==> Deploying inspection edge functions..."
npx --yes supabase@2.109.1 functions deploy \
  inspection-analysis \
  inspection-engine \
  inspection-scoring \
  inspection-pedigree-insight \
  inspection-pedigree-research \
  inspection-final-verdict \
  inspection-upload-video \
  video-pose-frames \
  detect-horse-pose \
  --project-ref "$PROJECT_REF"

echo "==> Verifying inspection_analyses table..."
ANON=$(grep VITE_SUPABASE_PUBLISHABLE_KEY .env | cut -d= -f2- | tr -d '"')
HTTP=$(curl -s -o /tmp/sb_check.json -w "%{http_code}" \
  "https://${PROJECT_REF}.supabase.co/rest/v1/inspection_analyses?select=id&limit=1" \
  -H "apikey: ${ANON}")
if [[ "$HTTP" == "200" ]]; then
  echo "SUCCESS: inspection_analyses exists (HTTP 200)"
else
  echo "WARNING: inspection_analyses check returned HTTP ${HTTP}"
  cat /tmp/sb_check.json
  exit 1
fi

echo "==> Done. Refresh the platform and create a new inspection."
