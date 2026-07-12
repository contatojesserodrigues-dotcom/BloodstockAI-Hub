export const OFFICIAL_SITE_URL = "https://www.agentbloodstockai.com";
export const LOGO_URL = `${OFFICIAL_SITE_URL}/email/bloodstockai-logo.png`;

export const EMAIL_FONT =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

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

export const emailFontLink =
  '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />';

export const emailMain = {
  backgroundColor: EMAIL_COLORS.white,
  fontFamily: EMAIL_FONT,
} as const;

export const emailContainer = {
  padding: "0",
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: EMAIL_COLORS.white,
} as const;

export const emailHeader = {
  textAlign: "center" as const,
  padding: "32px 24px 24px",
  backgroundColor: EMAIL_COLORS.white,
  borderBottom: `1px solid ${EMAIL_COLORS.border}`,
} as const;

export const emailLogo = { margin: "0 auto", maxWidth: "200px" } as const;

export const emailCard = {
  backgroundColor: EMAIL_COLORS.white,
  padding: "28px 32px",
} as const;

export const emailH1 = {
  fontSize: "22px",
  fontWeight: "600" as const,
  color: EMAIL_COLORS.text,
  margin: "0 0 16px",
  fontFamily: EMAIL_FONT,
  letterSpacing: "-0.02em",
} as const;

export const emailH2 = {
  fontSize: "15px",
  fontWeight: "600" as const,
  color: EMAIL_COLORS.text,
  margin: "0 0 10px",
  fontFamily: EMAIL_FONT,
} as const;

export const emailText = {
  fontSize: "15px",
  color: EMAIL_COLORS.body,
  lineHeight: "1.65",
  margin: "0 0 16px",
  fontFamily: EMAIL_FONT,
} as const;

export const emailMuted = {
  fontSize: "13px",
  color: EMAIL_COLORS.muted,
  lineHeight: "1.6",
  margin: "0 0 12px",
  fontFamily: EMAIL_FONT,
} as const;

export const emailLink = {
  color: EMAIL_COLORS.gold,
  textDecoration: "underline",
  fontWeight: "500" as const,
} as const;

export const emailButton = {
  backgroundColor: EMAIL_COLORS.navy,
  color: EMAIL_COLORS.white,
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "10px",
  padding: "14px 28px",
  textDecoration: "none",
  fontFamily: EMAIL_FONT,
  display: "inline-block" as const,
} as const;

export const emailButtonOutline = {
  ...emailButton,
  backgroundColor: EMAIL_COLORS.white,
  color: EMAIL_COLORS.gold,
  border: `1px solid ${EMAIL_COLORS.gold}`,
} as const;

export const emailDivider = {
  borderTop: `1px solid ${EMAIL_COLORS.border}`,
  margin: "24px 0",
} as const;

export const emailHighlightBox = {
  backgroundColor: EMAIL_COLORS.goldLight,
  borderRadius: "12px",
  padding: "16px",
  margin: "20px 0",
  border: `1px solid rgba(197,138,43,0.2)`,
} as const;

export const emailFooter = {
  fontSize: "12px",
  color: EMAIL_COLORS.muted,
  margin: "20px 0 0",
  fontFamily: EMAIL_FONT,
} as const;

export const emailBottomBar = {
  textAlign: "center" as const,
  padding: "24px",
  backgroundColor: EMAIL_COLORS.white,
  borderTop: `1px solid ${EMAIL_COLORS.border}`,
} as const;

export const emailBottomText = {
  fontSize: "12px",
  color: EMAIL_COLORS.muted,
  textAlign: "center" as const,
  margin: "0 0 4px",
  fontFamily: EMAIL_FONT,
} as const;

export const emailFeatureItem = {
  fontSize: "14px",
  color: EMAIL_COLORS.body,
  lineHeight: "1.5",
  margin: "0 0 8px",
  fontFamily: EMAIL_FONT,
} as const;
