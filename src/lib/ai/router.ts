/**
 * Kuiper LLM Router — provider abstraction + task-based model selection.
 */

export type LLMProviderId = "claude" | "openai" | "perplexity" | "grok" | "gemini";

export type LLMTaskKind =
  | "long_documents"
  | "reasoning"
  | "realtime_research"
  | "social_trends"
  | "writing"
  | "general";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMGenerateParams {
  system: string;
  message: string;
  history?: { role: string; content: string }[];
  task?: LLMTaskKind | string;
}

export interface LLMProvider {
  id: LLMProviderId;
  isAvailable(): boolean;
  generate(params: LLMGenerateParams): Promise<string | null>;
}

function hasKey(name: string) {
  return Boolean(process.env[name]?.trim());
}

async function callAnthropic(params: LLMGenerateParams): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: params.system,
      messages: [
        ...(params.history || []).slice(-6).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
        { role: "user", content: params.message },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.content?.find((c: { type: string }) => c.type === "text")?.text || null;
}

async function callOpenAI(params: LLMGenerateParams): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: params.system },
        ...(params.history || []).slice(-6).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: params.message },
      ],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callPerplexity(params: LLMGenerateParams): Promise<string | null> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.PERPLEXITY_MODEL || "sonar",
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.message },
      ],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callGrok(params: LLMGenerateParams): Promise<string | null> {
  const key = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.GROK_MODEL || "grok-2-latest",
      messages: [
        { role: "system", content: params.system },
        ...(params.history || []).slice(-6).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: params.message },
      ],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callGemini(params: LLMGenerateParams): Promise<string | null> {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.system }] },
        contents: [{ role: "user", parts: [{ text: params.message }] }],
      }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

export const providers: Record<LLMProviderId, LLMProvider> = {
  claude: {
    id: "claude",
    isAvailable: () => hasKey("ANTHROPIC_API_KEY"),
    generate: callAnthropic,
  },
  openai: {
    id: "openai",
    isAvailable: () => hasKey("OPENAI_API_KEY"),
    generate: callOpenAI,
  },
  perplexity: {
    id: "perplexity",
    isAvailable: () => hasKey("PERPLEXITY_API_KEY"),
    generate: callPerplexity,
  },
  grok: {
    id: "grok",
    isAvailable: () => hasKey("XAI_API_KEY") || hasKey("GROK_API_KEY"),
    generate: callGrok,
  },
  gemini: {
    id: "gemini",
    isAvailable: () => hasKey("GEMINI_API_KEY"),
    generate: callGemini,
  },
};

/** Task-based routing policy from the Kuiper brief. */
export function selectProviderForTask(task: string): LLMProviderId {
  const lower = task.toLowerCase();

  if (
    lower.includes("document") ||
    lower.includes("long") ||
    lower.includes("report") ||
    lower.includes("analyze")
  ) {
    return "claude";
  }
  if (
    lower.includes("research") ||
    lower.includes("market") ||
    lower.includes("auction") ||
    lower.includes("competitor")
  ) {
    return "perplexity";
  }
  if (
    lower.includes("social") ||
    lower.includes("trend") ||
    lower.includes("twitter") ||
    lower.includes("tiktok")
  ) {
    return "grok";
  }
  if (
    lower.includes("reason") ||
    lower.includes("classify") ||
    lower.includes("chat") ||
    lower.includes("conversation")
  ) {
    return "openai";
  }
  if (lower.includes("write") || lower.includes("email") || lower.includes("sales")) {
    return "claude";
  }
  return "claude";
}

export async function routeGenerate(params: LLMGenerateParams): Promise<string | null> {
  const preferred = selectProviderForTask(params.task || params.message);
  const order: LLMProviderId[] = [
    preferred,
    "claude",
    "openai",
    "perplexity",
    "grok",
    "gemini",
  ];
  const tried = new Set<LLMProviderId>();

  for (const id of order) {
    if (tried.has(id)) continue;
    tried.add(id);
    const provider = providers[id];
    if (!provider.isAvailable()) continue;
    const result = await provider.generate(params);
    if (result) return result;
  }
  return null;
}
