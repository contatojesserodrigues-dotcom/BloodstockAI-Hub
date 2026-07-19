import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Bot, ShieldCheck, Store, Workflow } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { BrandFooter } from "@/components/brand/BrandFooter";
import { KuiperLogo } from "@/components/brand/KuiperLogo";
import { BRAND } from "@/lib/brand";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-crypto";

const FEATURES = [
  { icon: Bot, label: "AI Workforce", desc: "Build and manage specialized agents" },
  { icon: Store, label: "Agent Marketplace", desc: "Department templates ready to deploy" },
  { icon: ShieldCheck, label: "Human Approval", desc: "Safe automation with review queues" },
  { icon: Workflow, label: "Automation", desc: "Workflows connected to your tools" },
];

export default async function LoginPage() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    const session = await verifySessionToken(token);
    if (session) redirect("/dashboard");
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(106,13,173,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(230,0,160,0.05),transparent_45%)]" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col lg:flex-row">
        <aside className="hidden w-full max-w-[440px] shrink-0 flex-col border-r border-bs-border bg-bs-surface/80 backdrop-blur-xl lg:flex">
          <div className="border-b border-bs-border p-6 xl:p-8">
            <KuiperLogo variant="nav" showWordmark priority />
          </div>

          <div className="flex flex-1 flex-col justify-between p-6 xl:p-8">
            <div>
              <div className="mb-6 flex justify-center xl:justify-start">
                <KuiperLogo variant="hero" priority />
              </div>
              <h1 className="text-3xl font-light tracking-tight text-bs-text xl:text-4xl">
                Build your AI<br />
                <span className="text-bs-accent">workforce</span>
              </h1>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-bs-muted">
                The operating system where companies create, orchestrate, and manage AI agents.
              </p>

              <div className="mt-8 grid gap-3">
                {FEATURES.map((f) => (
                  <div key={f.label} className="glass glass-hover flex items-start gap-3 rounded-xl p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bs-accent/10">
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
              <BrandFooter />
            </div>
          </div>
        </aside>

        <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
          <div className="mb-6 flex w-full max-w-[440px] flex-col items-center text-center lg:hidden">
            <KuiperLogo variant="hero" priority className="mb-4 justify-center" />
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{BRAND.name}</h1>
            <p className="mt-1 text-sm text-bs-muted">{BRAND.tagline}</p>
            <a href="/signup" className="mt-4 text-sm font-medium text-bs-accent hover:underline">
              Create a new account →
            </a>
          </div>

          <Suspense fallback={<div className="glass h-96 w-full max-w-[440px] animate-pulse rounded-2xl" />}>
            <LoginForm />
          </Suspense>

          <div className="mt-8 px-2">
            <BrandFooter className="text-center" />
          </div>
        </main>
      </div>
    </div>
  );
}
