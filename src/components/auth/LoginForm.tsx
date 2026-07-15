"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("admin@bloodstockai.com");
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
      setError("Connection error. Restart the dev server and try again.");
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

      <form onSubmit={handleSubmit} method="post" action="#" className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[11px] uppercase tracking-wider text-bs-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
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
            name="password"
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

      <p className="mt-4 text-center text-[11px] text-white/30">
        Use exactly: <span className="text-white/50">BloodstockAI2026!</span>
      </p>
    </div>
  );
}
