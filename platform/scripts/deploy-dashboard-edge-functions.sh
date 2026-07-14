#!/usr/bin/env bash
# Deploy dashboard-critical edge functions with JWT settings from supabase/config.toml
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/Users/jesserodrigues/atom-ai-works/.tools/node-v22.14.0-darwin-x64/bin:$PATH"
PROJECT_REF="${SUPABASE_PROJECT_REF:-uzkicvizgezitiyhihcq}"
CLI="npx --yes supabase@2.109.1"

set -a
[[ -f .env.migrate.local ]] && source .env.migrate.local
[[ -f .env ]] && source .env
set +a

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN"
  exit 1
fi

# verify_jwt = false in config.toml — gateway must not block anon/session calls; functions validate auth internally.
NO_JWT=(
  ai-analysis upload-pdf process-catalogue compare-uploads
  catalog-extract catalog-research catalog-analyze
  stallion-suggestion broodmare-planning bloodstock-analysis pedigree-lookup
  performance-analysis market-news market-insights
  training-video-analysis training-gps-parse training-insight
  inspection-analysis inspection-engine inspection-scoring
  inspection-pedigree-insight inspection-pedigree-research inspection-final-verdict
  inspection-upload-video video-pose-frames detect-horse-pose
  contact-inquiry create-payment create-guest-report-payment purchase-catalog
  revolut-webhook stripe-webhook send-email send-invitation brevo-add-contact
)

# verify_jwt = true — require valid user JWT at gateway.
WITH_JWT=(
  ai-chat compare-horses horse-search mating-analysis broodmare-plan
  check-subscription create-checkout customer-portal generate-pdf-report
  purchase-report send-campaign send-personal-email external-api-sync
  fetch-remote-video analyze-auction-catalog mcp
)

echo "Deploying ${#NO_JWT[@]} functions (verify_jwt=false)..."
for fn in "${NO_JWT[@]}"; do
  echo "  -> $fn"
  $CLI functions deploy "$fn" --project-ref "$PROJECT_REF" --no-verify-jwt
done

echo "Deploying ${#WITH_JWT[@]} functions (verify_jwt=true)..."
for fn in "${WITH_JWT[@]}"; do
  echo "  -> $fn"
  $CLI functions deploy "$fn" --project-ref "$PROJECT_REF"
done

echo "Done."
