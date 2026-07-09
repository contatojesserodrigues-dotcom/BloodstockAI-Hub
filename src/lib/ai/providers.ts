import { selectProvider } from "@/lib/workflow";
import type { LiveAgent } from "@/lib/agent-service";

const SYSTEM_PREFIX = `You are a BloodstockAI virtual agent. Respond professionally and concisely. Never claim to have sent emails or updated CRM without approval. All outbound actions require human approval first.`;

export async function generateAgentResponse(
  agent: LiveAgent,
  message: string,
  history: { role: string; content: string }[] = []
): Promise<string | null> {
  const provider = selectProvider(message);
  const system = `${SYSTEM_PREFIX}\n\nYou are ${agent.name}, ${agent.role}.\nBio: ${agent.bio}\nCurrent task: ${agent.currentTask}`;

  if (provider === "claude" && process.env.ANTHROPIC_API_KEY) {
    return callAnthropic(system, message, history);
  }
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return callOpenAI(system, message, history);
  }
  if (provider === "perplexity" && process.env.PERPLEXITY_API_KEY) {
    return callPerplexity(system, message);
  }
  if (provider === "gemini" && process.env.GEMINI_API_KEY) {
    return callGemini(system, message);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return callAnthropic(system, message, history);
  }
  if (process.env.OPENAI_API_KEY) {
    return callOpenAI(system, message, history);
  }
  return null;
}

async function callAnthropic(system: string, message: string, history: { role: string; content: string }[]) {
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
      system,
      messages: [
        ...history.slice(-6).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
        { role: "user", content: message },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data.content?.find((c: { type: string }) => c.type === "text")?.text;
  return text || null;
}

async function callOpenAI(system: string, message: string, history: { role: string; content: string }[]) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callPerplexity(system: string, message: string) {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.PERPLEXITY_MODEL || "sonar",
      messages: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callGemini(system: string, message: string) {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
      }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

export function extractN8nResponse(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.response === "string") return obj.response;
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.reply === "string") return obj.reply;
  if (obj.data && typeof obj.data === "object") {
    const nested = obj.data as Record<string, unknown>;
    if (typeof nested.response === "string") return nested.response;
    if (typeof nested.message === "string") return nested.message;
  }
  return null;
}
