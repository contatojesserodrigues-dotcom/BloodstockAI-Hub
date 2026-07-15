export function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) return true;
  const header = request.headers.get("x-hub-secret") || request.headers.get("authorization")?.replace("Bearer ", "");
  return header === secret;
}
