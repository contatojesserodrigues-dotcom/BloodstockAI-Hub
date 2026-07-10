import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";

const SUBSCRIBED_KEY = "bsai_newsletter_subscribed_v1";

export const FloatingNewsletterButton = () => {
  const { user, loading } = useAuth();
  const [subscribed, setSubscribed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(SUBSCRIBED_KEY);
  });
  const [cookieAccepted, setCookieAccepted] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return !!localStorage.getItem("cookie_consent");
  });

  useEffect(() => {
    const handler = () => setSubscribed(true);
    window.addEventListener("newsletter-subscribed", handler);
    return () => window.removeEventListener("newsletter-subscribed", handler);
  }, []);

  useEffect(() => {
    const check = () => setCookieAccepted(!!localStorage.getItem("cookie_consent"));
    const id = window.setInterval(check, 500);
    return () => window.clearInterval(id);
  }, []);

  if (loading || user || subscribed) return null;

  return (
    <button
      onClick={() => window.dispatchEvent(new Event("open-newsletter-popup"))}
      style={{ bottom: cookieAccepted ? "1.25rem" : "12rem" }}
      className="fixed right-4 sm:right-5 z-[110] flex items-center gap-2 px-4 sm:px-5 py-3 rounded-full bg-secondary text-background font-semibold uppercase tracking-wider text-[10px] sm:text-xs shadow-[0_10px_30px_-5px_hsl(43_76%_52%_/_0.5)] hover:shadow-[0_15px_35px_-5px_hsl(43_76%_52%_/_0.7)] hover:scale-[1.03] active:scale-95 transition-all duration-300 border border-secondary/40"
      aria-label="Subscribe to Newsletter"
    >
      <Mail className="w-4 h-4" />
      <span className="hidden sm:inline">Subscribe to Newsletter</span>
      <span className="sm:hidden">Subscribe</span>
    </button>
  );
};

export default FloatingNewsletterButton;