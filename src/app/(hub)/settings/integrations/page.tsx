"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Check, Plug } from "lucide-react";

interface IntegrationItem {
  id: string;
  label: string;
  category: string;
  envKey: string;
  url?: string;
  connected: boolean;
  configuredInEnv: boolean;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);

  useEffect(() => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then(setIntegrations)
      .catch(() => {});
  }, []);

  const categories = [...new Set(integrations.map((i) => i.category))];

  return (
    <>
      <Header title="Integrations" subtitle="Connect AI providers and tools - keys via environment variables only" />
      <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80">
        API keys are never hardcoded. Set environment variables in .env or your deployment platform.
      </div>
      {categories.map((cat) => (
        <div key={cat} className="mb-8">
          <h2 className="mb-4 text-sm font-medium text-white/70">{cat}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.filter((i) => i.category === cat).map((integration) => (
              <div key={integration.id} className="glass rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Plug className="h-4 w-4 text-bs-accent" />
                    <div>
                      <p className="text-sm font-medium">{integration.label}</p>
                      <p className="text-[10px] text-white/30">{integration.envKey}</p>
                      {integration.url && (
                        <a href={integration.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-bs-accent hover:underline">
                          {integration.url.replace("https://", "")}
                        </a>
                      )}
                    </div>
                  </div>
                  {integration.connected && <Check className="h-4 w-4 text-emerald-400" />}
                </div>
                <div className={`mt-4 w-full rounded-xl py-2 text-center text-xs ${
                  integration.connected
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border border-bs-border text-bs-muted"
                }`}>
                  {integration.connected
                    ? integration.configuredInEnv ? "Connected via .env" : "Connected"
                    : "Not configured"}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 text-sm font-medium">n8n Webhook Setup</h2>
        <p className="mb-4 text-sm text-bs-muted">
          Create these webhook workflows in your n8n instance at bloodstockai.app.n8n.cloud:
        </p>
        <div className="space-y-3 font-mono text-xs">
          <div className="rounded-xl border border-bs-border bg-black/30 p-3">
            <p className="text-bs-accent">POST /webhook/agent-command</p>
            <p className="mt-1 text-white/40">Receives chat commands from the HUB</p>
          </div>
          <div className="rounded-xl border border-bs-border bg-black/30 p-3">
            <p className="text-bs-accent">POST /webhook/consignor-workflow</p>
            <p className="mt-1 text-white/40">Triggers the UK/Ireland consignor workflow</p>
          </div>
          <div className="rounded-xl border border-bs-border bg-black/30 p-3">
            <p className="text-bs-accent">POST /webhook/send-approved-emails</p>
            <p className="mt-1 text-white/40">Triggered when you click Approve in the HUB</p>
          </div>
          <div className="rounded-xl border border-bs-border bg-black/30 p-3">
            <p className="text-bs-accent">POST /api/n8n/webhook (HUB inbound)</p>
            <p className="mt-1 text-white/40">n8n sends logs, approvals, leads and status updates back</p>
          </div>
        </div>
      </div>
    </>
  );
}
