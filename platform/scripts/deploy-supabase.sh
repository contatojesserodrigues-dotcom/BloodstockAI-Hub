#!/usr/bin/env bash
# Deploy Supabase schema + edge functions to the linked project.
# Prerequisites:
#   export SUPABASE_ACCESS_TOKEN=...   # from https://supabase.com/dashboard/account/tokens
#   export SUPABASE_DB_PASSWORD=...    # database password from project settings
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="/Users/jesserodrigues/atom-ai-works/.tools/node-v22.14.0-darwin-x64/bin:$PATH"
PROJECT_REF="uzkicvizgezitiyhihcq"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN. Run: supabase login"
  exit 1
fi

echo "Linking project ${PROJECT_REF}..."
npx --yes supabase@2.109.1 link --project-ref "$PROJECT_REF"

if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  DB_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
  echo "Pushing migrations..."
  npx --yes supabase@2.109.1 db push --db-url "$DB_URL"
else
  echo "Pushing migrations (linked)..."
  npx --yes supabase@2.109.1 db push
fi

echo "Deploying edge functions..."
npx --yes supabase@2.109.1 functions deploy --project-ref "$PROJECT_REF"

echo "Done. Run: node scripts/setup-production.mjs"
