#!/usr/bin/env bash
# Apply full Supabase schema + deploy all edge functions for BloodstockAI platform.
# Project: uzkicvizgezitiyhihcq
#
# Required:
#   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
#
# One of (for migrations):
#   POSTGRES_URL / POSTGRES_URL_NON_POOLING  — from Vercel Supabase integration
#   SUPABASE_DB_PASSWORD                     — database password from Supabase dashboard
#
# Optional (for AI edge functions):
#   TAVILY_API_KEY, ANTHROPIC_API_KEY — or pull from Vercel via env pull first
#
# Quick start:
#   cd platform
#   npx vercel@55.0.0 env pull .env.vercel.production --environment=production --yes
#   set -a && source .env.vercel.production && set +a
#   export SUPABASE_ACCESS_TOKEN=sbp_...
#   bash scripts/setup-full-platform-supabase.sh
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="/Users/jesserodrigues/atom-ai-works/.tools/node-v22.14.0-darwin-x64/bin:$PATH"
PROJECT_REF="${SUPABASE_PROJECT_REF:-uzkicvizgezitiyhihcq}"
SUPABASE_CLI="npx --yes supabase@2.109.1"

# Load local + Vercel env if present (no output)
set -a
[[ -f .env ]] && source .env
[[ -f .env.vercel.production ]] && source .env.vercel.production
set +a

echo "==> BloodstockAI — Full Platform Supabase Setup"
echo "Project: ${PROJECT_REF}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: Missing SUPABASE_ACCESS_TOKEN"
  echo "Create one at: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

export SUPABASE_ACCESS_TOKEN

echo "==> Linking Supabase project..."
if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  $SUPABASE_CLI link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
else
  $SUPABASE_CLI link --project-ref "$PROJECT_REF"
fi

echo "==> Applying database migrations..."
if [[ -n "${POSTGRES_URL_NON_POOLING:-}" ]]; then
  $SUPABASE_CLI db push --db-url "$POSTGRES_URL_NON_POOLING" --yes
elif [[ -n "${POSTGRES_URL:-}" ]]; then
  $SUPABASE_CLI db push --db-url "$POSTGRES_URL" --yes
elif [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  DB_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
  $SUPABASE_CLI db push --db-url "$DB_URL" --yes
else
  $SUPABASE_CLI db push --yes
fi

echo "==> Setting Supabase secrets..."
SECRET_ARGS=(
  "APP_URL=${APP_URL:-https://www.agentbloodstockai.com}"
  "SCIENTIFIC_SCORING_ENGINE_URL=${SCIENTIFIC_SCORING_ENGINE_URL:-https://bloodstockai-hub-production.up.railway.app}"
)
[[ -n "${TAVILY_API_KEY:-}" ]] && SECRET_ARGS+=("TAVILY_API_KEY=${TAVILY_API_KEY}")
[[ -n "${ANTHROPIC_API_KEY:-}" ]] && SECRET_ARGS+=("ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}")
[[ -n "${ANTHROPIC_PEDIGREE_MODEL:-}" ]] && SECRET_ARGS+=("ANTHROPIC_PEDIGREE_MODEL=${ANTHROPIC_PEDIGREE_MODEL}")
[[ -n "${SCORING_API_KEY:-}" ]] && SECRET_ARGS+=("SCORING_API_KEY=${SCORING_API_KEY}")
[[ -n "${RESEND_API_KEY:-}" ]] && SECRET_ARGS+=("RESEND_API_KEY=${RESEND_API_KEY}")
[[ -n "${SEND_EMAIL_HOOK_SECRET:-}" ]] && SECRET_ARGS+=("SEND_EMAIL_HOOK_SECRET=${SEND_EMAIL_HOOK_SECRET}")
[[ -n "${BREVO_API_KEY:-}" ]] && SECRET_ARGS+=("BREVO_API_KEY=${BREVO_API_KEY}")
[[ -n "${BREVO_LIST_ID:-}" ]] && SECRET_ARGS+=("BREVO_LIST_ID=${BREVO_LIST_ID}")
[[ -n "${STRIPE_SECRET_KEY:-}" ]] && SECRET_ARGS+=("STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}")
[[ -n "${REVOLUT_API_KEY:-}" ]] && SECRET_ARGS+=("REVOLUT_API_KEY=${REVOLUT_API_KEY}")
[[ -n "${REVOLUT_WEBHOOK_SECRET:-}" ]] && SECRET_ARGS+=("REVOLUT_WEBHOOK_SECRET=${REVOLUT_WEBHOOK_SECRET}")

$SUPABASE_CLI secrets set "${SECRET_ARGS[@]}" --project-ref "$PROJECT_REF"

echo "==> Deploying all edge functions..."
FUNCTIONS=(
  ai-analysis ai-chat auth-email-hook broodmare-plan broodmare-planning
  bloodstock-analysis catalog-analyze catalog-extract catalog-research
  check-subscription compare-horses compare-uploads contact-inquiry
  create-checkout create-payment create-guest-report-payment customer-portal
  detect-horse-pose external-api-sync fetch-remote-video generate-pdf-report
  horse-search inspection-analysis inspection-engine inspection-final-verdict
  inspection-pedigree-insight inspection-pedigree-research inspection-scoring
  inspection-upload-video market-insights market-news mating-analysis
  performance-analysis pedigree-lookup process-catalogue purchase-catalog
  purchase-report revolut-webhook send-campaign send-email send-invitation
  send-personal-email stallion-suggestion training-gps-parse training-insight
  training-video-analysis upload-pdf video-pose-frames brevo-add-contact
  analyze-auction-catalog mcp
)

$SUPABASE_CLI functions deploy "${FUNCTIONS[@]}" --project-ref "$PROJECT_REF"

echo "==> Running admin bootstrap (optional)..."
if [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  NEW_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" node scripts/setup-production.mjs || true
fi

echo "==> Verifying platform connectivity..."
node scripts/verify-platform-supabase.mjs

echo "==> Done. Redeploy Vercel if env vars changed:"
echo "    npx vercel@55.0.0 deploy --prod --yes"
