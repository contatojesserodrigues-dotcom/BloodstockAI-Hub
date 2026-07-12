import { useEffect } from "react";
import { redirectPreviewToOfficial } from "@/lib/siteUrl";

/** Sends Vercel preview / localhost traffic to www.agentbloodstockai.com. */
export function CanonicalDomainRedirect() {
  useEffect(() => {
    redirectPreviewToOfficial();
  }, []);
  return null;
}
