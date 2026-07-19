import { Header } from "@/components/layout/Header";
import { BrandFooter } from "@/components/brand/BrandFooter";
import { BRAND } from "@/lib/brand";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" subtitle="Workspace, security, and brand preferences" />
      <div className="grid max-w-2xl gap-4">
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-medium">Brand</p>
          <p className="mt-2 text-sm text-bs-muted">{BRAND.name}</p>
          <BrandFooter className="mt-2" />
        </div>
        <Link href="/settings/integrations" className="glass glass-hover rounded-2xl p-5">
          <p className="text-sm font-medium">Integrations</p>
          <p className="mt-1 text-sm text-bs-muted">Connect Google, Microsoft, CRM, and sales tools</p>
        </Link>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-medium">Voice AI</p>
          <p className="mt-1 text-sm text-bs-muted">
            Speech-to-text (Whisper) and multi-language TTS — Coming soon in Phase 2.
          </p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-medium">Security</p>
          <p className="mt-1 text-sm text-bs-muted">
            Cookie session auth today. Supabase Auth + RLS multi-tenant cutover planned for Phase 2.
          </p>
        </div>
      </div>
    </>
  );
}
