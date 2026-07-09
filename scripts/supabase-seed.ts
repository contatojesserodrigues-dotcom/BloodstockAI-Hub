/**
 * Seed BloodstockAI agents + tool connections into Supabase via REST API.
 * Run: npm run db:supabase-seed
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { AGENT_CONFIG, TOOL_CONNECTIONS } from "../src/lib/agents/agent-config.ts";
import { createSupabaseRestAdmin } from "../src/lib/supabase/rest-client.ts";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq);
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // use existing env
  }
}

async function main() {
  loadEnv();

  const admin = createSupabaseRestAdmin();
  if (!admin) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log("Seeding Supabase via REST...");

  for (const agent of AGENT_CONFIG) {
    const { error } = await admin.from("agents").upsert({
      slug: agent.slug,
      name: agent.name,
      role: agent.role,
      department: agent.department,
      room: agent.room,
      bio: agent.bio,
      status: agent.status,
      current_task: agent.current_task,
      last_action: agent.last_action,
      tools: agent.tools,
      avatar_color: agent.avatar_color,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error(`Agent ${agent.slug}:`, error.message);
    else console.log(`  ✓ ${agent.name}`);
  }

  for (const tool of TOOL_CONNECTIONS) {
    const connected = tool.envKey ? Boolean(process.env[tool.envKey]) : false;
    await admin.from("tool_connections").upsert({
      provider: tool.provider,
      label: tool.label,
      connected,
      updated_at: new Date().toISOString(),
    });
  }

  await admin.from("provider_configs").upsert({
    provider: "claude",
    enabled: Boolean(process.env.ANTHROPIC_API_KEY),
    model: "claude-sonnet-4-20250514",
    updated_at: new Date().toISOString(),
  });

  console.log("Supabase seed complete — 14 agents, tool connections, Claude provider.");
}

main().catch(console.error);
