import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export class EdgeFunctionError extends Error {
  status?: number;
  code?: string;
  hint?: string;

  constructor(
    message: string,
    opts?: { status?: number; code?: string; hint?: string },
  ) {
    super(message);
    this.name = "EdgeFunctionError";
    this.status = opts?.status;
    this.code = opts?.code;
    this.hint = opts?.hint;
  }
}

async function authHeaders(requireSession = false): Promise<Record<string, string>> {
  if (!SUPABASE_ANON_KEY) {
    throw new EdgeFunctionError(
      "Backend not configured (missing VITE_SUPABASE_PUBLISHABLE_KEY).",
    );
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (requireSession && !token) {
    throw new EdgeFunctionError("Sign in required to run this analysis.");
  }

  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
  };
}

async function readResponseBody(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

type InvokeOptions = {
  body?: FormData | Record<string, unknown> | null;
  requireSession?: boolean;
};

/**
 * Reliable edge-function caller — uses fetch directly so FormData uploads and
 * error bodies surface correctly (supabase.functions.invoke often hides these).
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  options: InvokeOptions = {},
): Promise<T> {
  if (!SUPABASE_URL) {
    throw new EdgeFunctionError(
      "Backend not configured (missing VITE_SUPABASE_URL). Rebuild with Supabase env vars.",
    );
  }

  const headers = await authHeaders(options.requireSession);
  let body: BodyInit | undefined;

  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body != null) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: "POST",
      headers,
      body,
    });
  } catch (err: any) {
    throw new EdgeFunctionError(
      `Could not reach ${functionName}. Check your connection and try again.`,
    );
  }

  const payload = await readResponseBody(res);

  if (!res.ok) {
    throw new EdgeFunctionError(
      payload?.error || `Edge function ${functionName} failed (${res.status})`,
      { status: res.status, code: payload?.code, hint: payload?.hint },
    );
  }

  return payload as T;
}

/** Parse supabase-js FunctionsHttpError when legacy invoke() is still used. */
export async function edgeErrorMessage(error: unknown, fallback: string): Promise<string> {
  const err = error as any;
  if (!err) return fallback;

  try {
    const ctx = err.context;
    if (ctx && typeof ctx.json === "function") {
      const parsed = await ctx.json();
      if (parsed?.error) return String(parsed.error);
    }
    if (ctx?.body) {
      const body = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
      if (body?.error) return String(body.error);
    }
  } catch {
    /* ignore */
  }

  return err.message || fallback;
}
