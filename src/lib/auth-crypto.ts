export const COOKIE_NAME = "kp_session";
export const ONBOARDING_COOKIE = "kp_onboarded";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || "change-me-in-production";
}

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSign(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return toHex(signature);
}

export async function createSessionToken(email: string): Promise<string> {
  const exp = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = toBase64Url(JSON.stringify({ email, exp }));
  const signature = await hmacSign(payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<{ email: string } | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = await hmacSign(payload);
  if (signature.length !== expected.length) return null;

  let valid = true;
  for (let i = 0; i < signature.length; i++) {
    if (signature[i] !== expected[i]) valid = false;
  }
  if (!valid) return null;

  try {
    const data = JSON.parse(fromBase64Url(payload)) as {
      email: string;
      exp: number;
    };
    if (!data.email || !data.exp || data.exp < Date.now()) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

export { SESSION_MAX_AGE };
