"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { KuiperLogo } from "@/components/brand/KuiperLogo";
import { BrandFooter } from "@/components/brand/BrandFooter";
import { CATALOG_AGENTS, CATALOG_DEPARTMENTS } from "@/lib/agent-catalog";
import { INDUSTRIES } from "@/lib/brand";
import {
  AGENT_MONTHLY_USD,
  INTEGRATION_SETUP_FEE_USD,
  PREMIUM_SUPPORT_MONTHLY_USD,
  estimateSignupQuote,
} from "@/lib/pricing";

type AccountType = "COMPANY" | "PERSONAL";

export function SignupWizard() {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType>("COMPANY");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState<string>(INDUSTRIES[0]);
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("en");
  const [employeeCount, setEmployeeCount] = useState("1-10");
  const [objectives, setObjectives] = useState("");
  const [selected, setSelected] = useState<string[]>(["sdr-ai", "executive-assistant"]);
  const [activeDept, setActiveDept] = useState(CATALOG_DEPARTMENTS[0].id);
  const [premiumSupport, setPremiumSupport] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quote = useMemo(
    () => estimateSignupQuote({ agentCount: selected.length, premiumSupport }),
    [selected.length, premiumSupport]
  );

  const agentsInDept = CATALOG_AGENTS.filter((a) => a.departmentId === activeDept);

  function toggleAgent(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllInDept() {
    const ids = agentsInDept.map((a) => a.id);
    setSelected((prev) => Array.from(new Set([...prev, ...ids])));
  }

  const canContinue = useMemo(() => {
    if (step === 1) return !!accountType;
    if (step === 2) {
      return (
        email.includes("@") &&
        password.length >= 8 &&
        companyName.trim().length > 1
      );
    }
    if (step === 3) return selected.length > 0;
    if (step === 4) return acceptedTerms && selected.length > 0;
    return false;
  }, [step, accountType, email, password, companyName, selected.length, acceptedTerms]);

  async function finish() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          accountType,
          companyName,
          industry: accountType === "COMPANY" ? industry : "Other",
          country,
          language,
          employeeCount: accountType === "COMPANY" ? employeeCount : "1",
          objectives,
          agentIds: selected,
          premiumSupport,
        }),
      });
      const data = (await res.json()) as { error?: string; redirect?: string };
      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }
      window.location.replace(data.redirect || "/dashboard");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <KuiperLogo variant="nav" showWordmark priority />
          <p className="ml-auto text-[11px] text-bs-muted">Step {step} of 4</p>
        </div>

        <div className="mb-6 flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-bs-accent" : "bg-bs-border"}`}
            />
          ))}
        </div>

        <div className="glass flex-1 rounded-2xl p-4 sm:p-8">
          {step === 1 && (
            <>
              <h1 className="bs-heading text-2xl">Create your AI workforce</h1>
              <p className="bs-subheading mt-2">
                Each AI agent is <strong className="text-bs-accent">${AGENT_MONTHLY_USD}/month</strong>.
                Basic support included.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { id: "COMPANY" as const, title: "Company", desc: "Team workspace with departments and shared agents." },
                  { id: "PERSONAL" as const, title: "Personal Assistant", desc: "Your private AI workforce for solo work." },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAccountType(opt.id)}
                    className={`rounded-2xl border p-5 text-left transition ${
                      accountType === opt.id
                        ? "border-bs-accent bg-bs-accent/5"
                        : "border-bs-border hover:border-bs-accent/30"
                    }`}
                  >
                    <p className="font-medium">{opt.title}</p>
                    <p className="mt-1 text-sm text-bs-muted">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="bs-heading text-2xl">Account & workspace</h1>
              <p className="bs-subheading mt-2">Create your login and tell us about your hub.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Email</label>
                  <input className="bs-input min-h-11" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Password (min 8)</label>
                  <input className="bs-input min-h-11" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Your name</label>
                  <input className="bs-input min-h-11" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">
                    {accountType === "COMPANY" ? "Company name" : "Workspace name"}
                  </label>
                  <input className="bs-input min-h-11" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </div>
                {accountType === "COMPANY" && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Industry</label>
                      <select className="bs-input min-h-11" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                        {INDUSTRIES.map((i) => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Employees</label>
                      <select className="bs-input min-h-11" value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)}>
                        {["1-10", "11-50", "51-200", "201-1000", "1000+"].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Country</label>
                  <input className="bs-input min-h-11" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Language</label>
                  <select className="bs-input min-h-11" value={language} onChange={(e) => setLanguage(e.target.value)}>
                    {[
                      ["en", "English"],
                      ["pt", "Portuguese"],
                      ["es", "Spanish"],
                      ["fr", "French"],
                      ["de", "German"],
                      ["it", "Italian"],
                    ].map(([code, label]) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Objectives</label>
                  <textarea
                    className="bs-input min-h-24"
                    value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    placeholder="e.g. Automate sales outreach and weekly reporting"
                  />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="bs-heading text-2xl">Choose your AI employees</h1>
              <p className="bs-subheading mt-2">
                ${AGENT_MONTHLY_USD}/mo per agent · {selected.length} selected · ${quote.agentsMonthly}/mo
              </p>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {CATALOG_DEPARTMENTS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setActiveDept(d.id)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] transition ${
                      activeDept === d.id
                        ? "border-bs-accent bg-bs-accent/10 text-bs-accent"
                        : "border-bs-border text-bs-muted"
                    }`}
                  >
                    {d.emoji} {d.name}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex justify-end">
                <button type="button" className="text-[12px] text-bs-accent hover:underline" onClick={selectAllInDept}>
                  Select all in department
                </button>
              </div>

              <div className="mt-3 grid max-h-[50vh] gap-3 overflow-y-auto sm:grid-cols-2">
                {agentsInDept.map((agent) => {
                  const on = selected.includes(agent.id);
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => toggleAgent(agent.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        on ? "border-bs-accent bg-bs-accent/5" : "border-bs-border hover:border-bs-accent/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{agent.name}</p>
                          <p className="text-[11px] text-bs-muted">{agent.role}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-bs-accent/10 px-2 py-0.5 text-[10px] text-bs-accent">
                          ${AGENT_MONTHLY_USD}/mo
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] text-bs-muted">{agent.description}</p>
                      <ul className="mt-2 space-y-0.5">
                        {agent.functions.slice(0, 3).map((f) => (
                          <li key={f} className="text-[11px] text-bs-muted">• {f}</li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="bs-heading text-2xl">Review & launch</h1>
              <p className="bs-subheading mt-2">Confirm your AI workforce and pricing.</p>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-bs-border p-4">
                  <p className="text-sm font-medium">Selected agents ({selected.length})</p>
                  <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                    {selected.map((id) => {
                      const a = CATALOG_AGENTS.find((x) => x.id === id);
                      if (!a) return null;
                      return (
                        <li key={id} className="flex justify-between gap-2 text-sm">
                          <span className="text-bs-text">{a.name}</span>
                          <span className="text-bs-muted">${AGENT_MONTHLY_USD}/mo</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="rounded-2xl border border-bs-border p-4">
                  <p className="text-sm font-medium">Pricing summary</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {quote.lines.map((line) => (
                      <li key={line.label} className="flex justify-between gap-3 text-bs-muted">
                        <span>
                          {line.label}
                          <span className="ml-1 text-[10px] uppercase">({line.cadence})</span>
                        </span>
                        <span className="shrink-0 text-bs-text">${line.amount.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 space-y-1 border-t border-bs-border pt-4">
                    <p className="flex justify-between text-sm">
                      <span className="text-bs-muted">Monthly recurring</span>
                      <span className="font-medium">${quote.monthlyTotal.toFixed(2)}/mo</span>
                    </p>
                    <p className="flex justify-between text-sm">
                      <span className="text-bs-muted">One-time integration</span>
                      <span className="font-medium">${INTEGRATION_SETUP_FEE_USD.toFixed(2)}</span>
                    </p>
                    <p className="flex justify-between text-base font-semibold text-bs-accent">
                      <span>First month total</span>
                      <span>${quote.firstMonthTotal.toFixed(2)}</span>
                    </p>
                  </div>

                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-bs-border p-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={premiumSupport}
                      onChange={(e) => setPremiumSupport(e.target.checked)}
                    />
                    <span className="text-sm text-bs-muted">
                      Add <strong className="text-bs-text">Premium support & monitoring</strong> (+${PREMIUM_SUPPORT_MONTHLY_USD}/mo).
                      Basic support is already included with your agents.
                    </span>
                  </label>
                </div>
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-bs-muted">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span>
                  I agree to the{" "}
                  <Link href="/legal/terms" className="text-bs-accent hover:underline" target="_blank">Terms of Use</Link>,{" "}
                  <Link href="/legal/license" className="text-bs-accent hover:underline" target="_blank">License Terms</Link>,{" "}
                  <Link href="/legal/usage" className="text-bs-accent hover:underline" target="_blank">Usage Policy</Link>, and{" "}
                  <Link href="/legal/privacy" className="text-bs-accent hover:underline" target="_blank">Privacy Policy</Link>.
                </span>
              </label>
            </>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3">
              {step > 1 ? (
                <button type="button" className="bs-btn-ghost" disabled={loading} onClick={() => setStep((s) => s - 1)}>
                  Back
                </button>
              ) : (
                <Link href="/login" className="bs-btn-ghost">
                  Sign in instead
                </Link>
              )}
            </div>
            {step < 4 ? (
              <button type="button" className="bs-btn-primary" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
                Continue
              </button>
            ) : (
              <button type="button" className="bs-btn-primary" disabled={!canContinue || loading} onClick={finish}>
                {loading ? "Creating hub..." : "Launch my AI Hub"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-8">
          <BrandFooter className="text-center" />
        </div>
      </div>
    </div>
  );
}
