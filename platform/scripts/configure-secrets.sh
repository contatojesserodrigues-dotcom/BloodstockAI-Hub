#!/usr/bin/env bash
# Configure production secrets from environment variables (never commit keys).
# Usage:
#   export TAVILY_API_KEY='...'
#   export ANTHROPIC_API_KEY='...'
#   bash scripts/configure-secrets.sh
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="/Users/jesserodrigues/atom-ai-works/.tools/node-v22.14.0-darwin-x64/bin:$PATH"
PROJECT_REF="${SUPABASE_PROJECT_REF:-uzkicvizgezitiyhihcq}"

if [[ -z "${TAVILY_API_KEY:-}" ]]; then
  echo "Missing TAVILY_API_KEY"
  exit 1
fi
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "Missing ANTHROPIC_API_KEY"
  exit 1
fi

echo "Setting Vercel production env..."
printf '%s' "$TAVILY_API_KEY" | npx vercel@55.0.0 env add TAVILY_API_KEY production --force
printf '%s' "$ANTHROPIC_API_KEY" | npx vercel@55.0.0 env add ANTHROPIC_API_KEY production --force

echo "Setting Supabase secrets..."
npx --yes supabase@2.109.1 secrets set \
  TAVILY_API_KEY="$TAVILY_API_KEY" \
  ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  ANTHROPIC_PEDIGREE_MODEL="${ANTHROPIC_PEDIGREE_MODEL:-claude-sonnet-4-5-20250929}" \
  --project-ref "$PROJECT_REF"

echo "Deploying edge functions..."
ANALYSIS_FUNCTIONS=(
  market-news
  ai-analysis
  upload-pdf
  horse-search
  performance-analysis
  mating-analysis
  pedigree-lookup
  market-insights
  bloodstock-analysis
  broodmare-planning
  catalog-research
  catalog-analyze
  catalog-extract
  stallion-suggestion
  inspection-pedigree-research
  process-catalogue
  ai-chat
)

npx --yes supabase@2.109.1 functions deploy "${ANALYSIS_FUNCTIONS[@]}" --project-ref "$PROJECT_REF"

echo "Done. Run: npx vercel@55.0.0 deploy --prod --yes"
