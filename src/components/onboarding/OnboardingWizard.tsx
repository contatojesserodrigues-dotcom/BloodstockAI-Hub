"use client";

import { useMemo, useState } from "react";
import { AGENT_DEPARTMENTS, INDUSTRIES } from "@/lib/brand";
import { BrandFooter } from "@/components/brand/BrandFooter";
import { KuiperLogo } from "@/components/brand/KuiperLogo";

type AccountType = "COMPANY" | "PERSONAL";

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType>("COMPANY");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<string>(INDUSTRIES[0]);
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("en");
  const [employeeCount, setEmployeeCount] = useState("1-10");
  const [objectives, setObjectives] = useState("");
  const [departments, setDepartments] = useState<string[]>(["sales", "administrative"]);
  const [customNeed, setCustomNeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = useMemo(() => {
    if (step === 1) return !!accountType;
    if (step === 2) return name.trim().length > 1;
    if (step === 3) return departments.length > 0 || customNeed.trim().length > 10;
    return false;
  }, [step, accountType, name, departments, customNeed]);

  function toggleDept(id: string) {
    setDepartments((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  async function finish() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          name,
          industry: accountType === "COMPANY" ? industry : "Other",
          country,
          language,
          employeeCount: accountType === "COMPANY" ? employeeCount : "1",
          objectives,
          departments,
          customNeed,
        }),
      });
      const data = (await res.json()) as { error?: string; redirect?: string };
      if (!res.ok) {
        setError(data.error || "Onboarding failed");
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
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          <KuiperLogo variant="nav" showWordmark priority />
          <p className="ml-auto text-[11px] text-bs-muted">Step {step} of 3</p>
        </div>

        <div className="mb-6 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-bs-accent" : "bg-bs-border"}`}
            />
          ))}
        </div>

        <div className="glass animate-room-enter flex-1 rounded-2xl p-6 sm:p-8">
          {step === 1 && (
            <>
              <h1 className="bs-heading text-2xl">Choose account type</h1>
              <p className="bs-subheading mt-2">How will you use Kuiper?</p>
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
              <h1 className="bs-heading text-2xl">
                {accountType === "COMPANY" ? "Company information" : "Your profile"}
              </h1>
              <p className="bs-subheading mt-2">We use this to customize your AI workforce.</p>
              <div className="mt-6 grid gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">
                    {accountType === "COMPANY" ? "Company name" : "Your name"}
                  </label>
                  <input className="bs-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                {accountType === "COMPANY" && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Industry</label>
                      <select className="bs-input" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                        {INDUSTRIES.map((i) => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Employees</label>
                      <select className="bs-input" value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)}>
                        {["1-10", "11-50", "51-200", "201-1000", "1000+"].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Country</label>
                    <input className="bs-input" value={country} onChange={(e) => setCountry(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Language</label>
                    <select className="bs-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
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
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">Business objectives</label>
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
              <h1 className="bs-heading text-2xl">Select AI departments</h1>
              <p className="bs-subheading mt-2">We will provision starter agents for each selection.</p>
              <div className="mt-6 grid gap-3">
                {AGENT_DEPARTMENTS.filter((d) => d.id !== "custom").map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => toggleDept(dept.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      departments.includes(dept.id)
                        ? "border-bs-accent bg-bs-accent/5"
                        : "border-bs-border hover:border-bs-accent/30"
                    }`}
                  >
                    <p className="font-medium">{dept.name}</p>
                    <p className="mt-1 text-sm text-bs-muted">{dept.description}</p>
                  </button>
                ))}
                <div className="rounded-2xl border border-bs-border p-4">
                  <p className="font-medium">Custom AI Agent</p>
                  <p className="mt-1 text-sm text-bs-muted">I need an AI agent that...</p>
                  <textarea
                    className="bs-input mt-3 min-h-20"
                    value={customNeed}
                    onChange={(e) => setCustomNeed(e.target.value)}
                    placeholder="Describe the agent you want..."
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              className="bs-btn-ghost"
              disabled={step === 1 || loading}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              Back
            </button>
            {step < 3 ? (
              <button
                type="button"
                className="bs-btn-primary"
                disabled={!canContinue}
                onClick={() => setStep((s) => s + 1)}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="bs-btn-primary"
                disabled={!canContinue || loading}
                onClick={finish}
              >
                {loading ? "Building workforce..." : "Launch Hub Center"}
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
