"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  Building2,
  Lock,
  ShieldCheck,
  Terminal,
  Workflow,
} from "lucide-react";
import { BRAND } from "@/lib/brand";

const FEATURES = [
  { icon: Bot, label: "12 AI Agents", desc: "Sales, CRM, research & outreach" },
  { icon: Terminal, label: "Live Terminal", desc: "Real-time n8n agent activity" },
  { icon: ShieldCheck, label: "Approval Queue", desc: "Human-in-the-loop control" },
  { icon: Workflow, label: "n8n Automation", desc: "Commands routed to cloud workflows" },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      const from = searchParams.get("from") || "/dashboard";
      window.location.href = from;
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass animate-room-enter w-full max-w-[420px] rounded-2xl p-8 shadow-2xl shadow-black/40">
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-wider text-bs-muted">Admin Access</p>
        <h2 className="bs-heading mt-2 text-2xl">Sign in</h2>
        <p className="bs-subheading mt-1">Enter your credentials to access the Operations Hub</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="bs-input"
            placeholder="admin@bloodstockai.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="bs-input"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button type="submit" className="bs-btn-primary w-full py-3" disabled={loading}>
          <Lock className="mr-2 inline h-4 w-4" />
          {loading ? "Signing in..." : "Sign In to Command Center"}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-2 rounded-xl border border-bs-border bg-white/[0.02] px-4 py-3">
        <ShieldCheck className="h-4 w-4 shrink-0 text-bs-accent" />
        <p className="text-[11px] leading-relaxed text-white/40">
          Restricted to administrators. All agent actions require approval before execution.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bs-bg">
      {/* Background accents — matches dashboard atmosphere */}
      <div className="pointer-events-none absolute inset-0">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,21,56,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,21,56,0.08),transparent_45%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Left brand panel — mirrors Sidebar */}
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

        {/* Right login panel */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          {/* Mobile brand header */}
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
