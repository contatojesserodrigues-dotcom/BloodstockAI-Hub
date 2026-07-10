import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Bot,
  Building2,
  ShieldCheck,
  Terminal,
  Workflow,
} from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { BRAND } from "@/lib/brand";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-crypto";

const FEATURES = [
  { icon: Bot, label: "12 AI Agents", desc: "Sales, CRM, research & outreach" },
  { icon: Terminal, label: "Live Terminal", desc: "Real-time n8n agent activity" },
  { icon: ShieldCheck, label: "Approval Queue", desc: "Human-in-the-loop control" },
  { icon: Workflow, label: "n8n Automation", desc: "Commands routed to cloud workflows" },
];

export default async function LoginPage() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    const session = await verifySessionToken(token);
    if (session) redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-bs-bg">
      <div className="pointer-events-none absolute inset-0">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,21,56,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,21,56,0.08),transparent_45%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-[420px] shrink-0 flex-col border-r border-bs-border bg-bs-surface/60 backdrop-blur-xl lg:flex">
          <div className="border-b border-bs-border p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bs-accent shadow-lg shadow-bs-accent/20">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-base font-medium tracking-tight">{BRAND.name}</p>
                <p className="text-[10px] tracking-wider uppercase text-bs-muted">Virtual HUB</p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between p-8">
            <div>
              <h1 className="text-3xl font-light tracking-tight text-bs-text">
                Agent Virtual<br />
                <span className="text-bs-accent-light">HUB Center</span>
              </h1>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-bs-muted">
                Premium AI operations dashboard for BloodstockAI agent monitoring, approval workflows and n8n automation.
              </p>

              <div className="mt-8 grid gap-3">
                {FEATURES.map((f) => (
                  <div key={f.label} className="glass glass-hover flex items-start gap-3 rounded-xl p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bs-accent/15">
                      <f.icon className="h-4 w-4 text-bs-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{f.label}</p>
                      <p className="text-[11px] text-bs-muted">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1 border-t border-bs-border pt-6">
              <p className="text-[11px] text-bs-muted">{BRAND.email}</p>
              <p className="text-[10px] text-white/20">{BRAND.website}</p>
            </div>
          </div>
        </aside>

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-bs-accent shadow-lg shadow-bs-accent/20">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-light tracking-tight">{BRAND.name}</h1>
            <p className="mt-1 text-sm text-bs-muted">Operations Hub</p>
          </div>

          <Suspense fallback={<div className="glass h-96 w-full max-w-[420px] animate-pulse rounded-2xl" />}>
            <LoginForm />
          </Suspense>

          <div className="mt-8 flex items-center gap-2 text-[11px] text-white/25">
            <Building2 className="h-3 w-3" />
            <span>BloodstockAI Operations Hub — Admin Only</span>
          </div>
        </main>
      </div>
    </div>
  );
}
