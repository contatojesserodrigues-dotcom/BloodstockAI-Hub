#!/usr/bin/env bash
# Wire BloodstockAI platform backend (Supabase + Resend + Vercel) without UI changes.
# Project: uzkicvizgezitiyhihcq
#
# Usage:
#   cd platform
#   export SUPABASE_ACCESS_TOKEN=sbp_...          # required — Supabase dashboard → Account → Tokens
#   export RESEND_API_KEY=re_...                 # required — Resend dashboard (same as Lovable setup)
#   export SEND_EMAIL_HOOK_SECRET=v1,whsec_...   # optional — Supabase Auth → Hooks → Send Email
#   npx vercel@55.0.0 env pull .env.vercel.production --environment=production --yes
#   bash scripts/wire-platform-backend.sh
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="/Users/jesserodrigues/atom-ai-works/.tools/node-v22.14.0-darwin-x64/bin:$PATH"

echo "==> BloodstockAI — Wire Platform Backend"
echo "    (no UI changes — Supabase schema, edge functions, Resend, admin access)"

# Load env files quietly
set -a
[[ -f .env ]] && source .env
[[ -f .env.vercel.production ]] && source .env.vercel.production
set +a

# Align Vite client vars with Vercel Supabase integration when present
if [[ -n "${SUPABASE_URL:-}" && -z "${VITE_SUPABASE_URL:-}" ]]; then
  export VITE_SUPABASE_URL="$SUPABASE_URL"
fi
if [[ -n "${SUPABASE_ANON_KEY:-}" && -z "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ]]; then
  export VITE_SUPABASE_PUBLISHABLE_KEY="$SUPABASE_ANON_KEY"
fi
if [[ -z "${VITE_SUPABASE_PROJECT_ID:-}" ]]; then
  export VITE_SUPABASE_PROJECT_ID="uzkicvizgezitiyhihcq"
fi

MISSING=()
[[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]] && MISSING+=("SUPABASE_ACCESS_TOKEN")
[[ -z "${RESEND_API_KEY:-}" ]] && MISSING+=("RESEND_API_KEY")

if ((${#MISSING[@]})); then
  echo ""
  echo "Missing required credentials: ${MISSING[*]}"
  echo ""
  echo "1) SUPABASE_ACCESS_TOKEN → https://supabase.com/dashboard/account/tokens"
  echo "2) RESEND_API_KEY        → https://resend.com/api-keys (same provider used in Lovable)"
  echo "3) Optional: pull Vercel DB + API keys:"
  echo "   npx vercel@55.0.0 env pull .env.vercel.production --environment=production --yes"
  echo ""
  exit 1
fi

echo "==> Step 1/4 — Supabase schema + edge functions + secrets"
bash scripts/setup-full-platform-supabase.sh

echo ""
echo "==> Step 2/4 — Admin account (admin@agentbloodstockai.com)"
if [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  NEW_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" node scripts/setup-production.mjs
else
  echo "WARN: SUPABASE_SERVICE_ROLE_KEY not loaded — run setup-production.mjs manually after env pull"
fi

echo ""
echo "==> Step 3/4 — Supabase Auth Send Email Hook (Resend)"
echo "Configure in Supabase Dashboard → Authentication → Hooks → Send Email:"
echo "  URL: https://uzkicvizgezitiyhihcq.supabase.co/functions/v1/auth-email-hook"
echo "  Copy SEND_EMAIL_HOOK_SECRET from the hook UI into Supabase secrets if not set yet."
echo "  Disable built-in SMTP if hook is enabled."

echo ""
echo "==> Step 4/4 — Redeploy Vercel (pick up any env changes)"
npx vercel@55.0.0 deploy --prod --yes

echo ""
echo "==> Verification"
node scripts/verify-platform-supabase.mjs || true

echo ""
echo "Done. Platform login:"
echo "  URL:      https://www.agentbloodstockai.com/auth"
echo "  Email:    admin@agentbloodstockai.com"
echo "  Password: (from ADMIN_PASSWORD env or BloodstockAI2026! default in setup-production.mjs)"
