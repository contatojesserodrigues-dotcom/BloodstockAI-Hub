/** Shared inline HTML email theme — white background, official BloodstockAI logo */

export const EMAIL_FONT =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const OFFICIAL_SITE_URL = "https://www.agentbloodstockai.com";

export const EMAIL_COLORS = {
  navy: "#0F172A",
  navyMid: "#111827",
  gold: "#C58A2B",
  goldLight: "#FBF6EF",
  text: "#111827",
  muted: "#6B7280",
  body: "#374151",
  border: "#E5E7EB",
  white: "#FFFFFF",
  bg: "#FFFFFF",
} as const;

/** Official logo hosted on production domain — no Supabase/Vercel URLs in emails */
export const LOGO_URL = `${OFFICIAL_SITE_URL}/email/bloodstockai-logo.png`;

export const emailFontLink =
  `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />`;

export const emailBodyOpen = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
${emailFontLink}
</head>
<body style="margin:0;padding:0;background:${EMAIL_COLORS.white};font-family:${EMAIL_FONT};">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${EMAIL_COLORS.white};">`;

export const emailHeaderHtml = `<tr><td style="text-align:center;padding:32px 24px 24px;background:${EMAIL_COLORS.white};border-bottom:1px solid ${EMAIL_COLORS.border};">
  <img src="${LOGO_URL}" alt="BloodstockAI" width="200" style="display:block;margin:0 auto;max-width:200px;height:auto;" />
</td></tr>`;

export const emailCardOpen = `<tr><td style="background:${EMAIL_COLORS.white};padding:28px 32px;">`;

export const emailCardClose = `</td></tr>`;

export const emailFooterBarHtml = (siteUrl = OFFICIAL_SITE_URL) =>
  `<tr><td style="text-align:center;padding:24px;background:${EMAIL_COLORS.white};border-top:1px solid ${EMAIL_COLORS.border};">
  <p style="font-size:12px;color:${EMAIL_COLORS.muted};margin:0 0 6px;font-family:${EMAIL_FONT};">&copy; 2026 BloodstockAI. All rights reserved.</p>
  <p style="font-size:12px;margin:0;font-family:${EMAIL_FONT};"><a href="${siteUrl}" style="color:${EMAIL_COLORS.gold};text-decoration:none;font-weight:600;">www.agentbloodstockai.com</a></p>
  <p style="font-size:11px;color:${EMAIL_COLORS.muted};margin:8px 0 0;font-family:${EMAIL_FONT};">Thoroughbred Intelligence for Professional Buyers</p>
</td></tr>`;

export const emailBodyClose = `</table></body></html>`;

export const emailH1 = (text: string) =>
  `<h1 style="font-size:22px;font-weight:600;color:${EMAIL_COLORS.text};margin:0 0 16px;font-family:${EMAIL_FONT};letter-spacing:-0.02em;">${text}</h1>`;

export const emailH2 = (text: string) =>
  `<p style="font-size:13px;font-weight:600;color:${EMAIL_COLORS.text};margin:0 0 10px;font-family:${EMAIL_FONT};text-transform:uppercase;letter-spacing:0.08em;">${text}</p>`;

export const emailP = (html: string) =>
  `<p style="font-size:15px;color:${EMAIL_COLORS.body};line-height:1.65;margin:0 0 16px;font-family:${EMAIL_FONT};">${html}</p>`;

export const emailMuted = (html: string) =>
  `<p style="font-size:12px;color:${EMAIL_COLORS.muted};line-height:1.6;margin:20px 0 0;font-family:${EMAIL_FONT};">${html}</p>`;

export const emailDivider = `<div style="border-top:1px solid ${EMAIL_COLORS.border};margin:24px 0;"></div>`;

export const emailButton = (href: string, label: string) =>
  `<table cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="background:${EMAIL_COLORS.navy};border-radius:10px;text-align:center;">
  <a href="${href}" style="display:inline-block;padding:14px 28px;color:${EMAIL_COLORS.white};font-family:${EMAIL_FONT};font-size:14px;font-weight:600;text-decoration:none;">${label}</a>
</td></tr></table>`;

export const emailButtonOutline = (href: string, label: string) =>
  `<table cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="border:1px solid ${EMAIL_COLORS.gold};border-radius:10px;text-align:center;background:${EMAIL_COLORS.white};">
  <a href="${href}" style="display:inline-block;padding:12px 24px;color:${EMAIL_COLORS.gold};font-family:${EMAIL_FONT};font-size:14px;font-weight:600;text-decoration:none;">${label}</a>
</td></tr></table>`;

export const emailHighlightBox = (html: string) =>
  `<div style="background:${EMAIL_COLORS.goldLight};border-radius:12px;padding:16px;margin:20px 0;border:1px solid rgba(197,138,43,0.2);font-family:${EMAIL_FONT};">${html}</div>`;

export const emailFeatureItem = (html: string) =>
  `<p style="font-size:14px;color:${EMAIL_COLORS.body};line-height:1.5;margin:0 0 8px;font-family:${EMAIL_FONT};">${html}</p>`;

export const emailLink = (href: string, label: string) =>
  `<a href="${href}" style="color:${EMAIL_COLORS.gold};text-decoration:underline;font-weight:500;">${label}</a>`;

export const emailCode = (token: string) =>
  `<p style="font-family:${EMAIL_FONT};font-size:28px;font-weight:700;color:${EMAIL_COLORS.navy};margin:0 0 24px;letter-spacing:4px;text-align:center;">${token}</p>`;
