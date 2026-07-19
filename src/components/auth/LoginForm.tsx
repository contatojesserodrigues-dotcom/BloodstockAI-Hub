"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { KuiperLogo } from "@/components/brand/KuiperLogo";
import { BRAND } from "@/lib/brand";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "same-origin",
      });
      const data = (await res.json()) as { error?: string; redirect?: string };
      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        return;
      }

      const from = searchParams.get("from");
      const target =
        from && from.startsWith("/") && !from.startsWith("//") ? from : data.redirect || "/dashboard";
      window.location.replace(target);
    } catch {
      setError("Connection error. Restart the server and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass animate-room-enter w-full max-w-[440px] rounded-2xl p-5 sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
        <div className="mb-2 hidden lg:block">
          <KuiperLogo variant="hero" priority className="justify-center" />
        </div>
        <p className="text-[11px] uppercase tracking-wider text-bs-muted">Secure Access</p>
        <h2 className="bs-heading mt-2 text-xl sm:text-2xl">Sign in</h2>
        <p className="bs-subheading mt-1 px-2">{BRAND.tagline}</p>
      </div>

      <form onSubmit={handleSubmit} method="post" action="#" className="space-y-4 sm:space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="bs-input min-h-11"
            placeholder="you@company.com"
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
            name="password"
            type="password"
            className="bs-input min-h-11"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button type="submit" className="bs-btn-primary min-h-11 w-full py-3" disabled={loading}>
          <Lock className="mr-2 inline h-4 w-4" />
          {loading ? "Signing in..." : "Enter Hub Center"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-bs-muted">
        New here?{" "}
        <a href="/signup" className="font-medium text-bs-accent hover:underline">
          Create a new account
        </a>
      </p>
    </div>
  );
}
