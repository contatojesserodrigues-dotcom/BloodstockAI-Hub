"use client";

import { useCallback, useState } from "react";
import { ExternalLink, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface EnrichedLead {
  companyName: string;
  contactName?: string | null;
  publicEmail?: string | null;
  publicPhone?: string | null;
  website?: string | null;
  country?: string | null;
  confidenceScore: number;
  sourceUrls: string[];
  segment?: string | null;
}

interface PipelineResponse {
  ok: boolean;
  mode: "live" | "mock";
  warnings?: string[];
  logs?: { agent: string; message: string; level?: string; time: string }[];
  companies?: EnrichedLead[];
  summary?: string;
  approvalIds?: string[];
  hubspotSynced?: number;
}

export function TavilyLeadSearch() {
  const addLog = useAppStore((s) => s.addLog);
  const [country, setCountry] = useState("UK and Ireland");
  const [segment, setSegment] = useState("bloodstock");
  const [auctionFocus, setAuctionFocus] = useState("Tattersalls and Goffs");
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PipelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/agents/tavily-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, segment, auctionFocus, limit, fullPipeline: true }),
      });
      const data = (await res.json()) as PipelineResponse;
      if (!res.ok) {
        setError((data as { error?: string }).error || "Search failed");
        return;
      }

      setResult(data);

      if (data.logs?.length) {
        data.logs.forEach((log) => {
          addLog({ time: log.time, agent: log.agent, message: log.message });
        });
      }
    } catch {
      setError("Connection error while running Tavily pipeline");
    } finally {
      setLoading(false);
    }
  }, [country, segment, auctionFocus, limit, addLog]);

  const companies = result?.companies || [];

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Search className="h-4 w-4 text-bs-accent" />
            <p className="text-sm font-medium">Tavily Lead Intelligence</p>
          </div>
          <p className="text-[12px] text-bs-muted">
            James searches → Emma enriches → Oliver HubSpot → Sophia drafts → approval required.
          </p>
        </div>
        <button
          type="button"
          onClick={runSearch}
          disabled={loading}
          className="bs-btn-primary w-full shrink-0 disabled:opacity-50 sm:w-auto"
        >
          {loading ? "Running pipeline..." : "Run Tavily Lead Search"}
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-bs-muted">Country</label>
          <input className="bs-input" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-bs-muted">Segment</label>
          <input className="bs-input" value={segment} onChange={(e) => setSegment(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-bs-muted">Auction focus</label>
          <input className="bs-input" value={auctionFocus} onChange={(e) => setAuctionFocus(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-bs-muted">Number of leads</label>
          <input
            className="bs-input"
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) || 10)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result?.warnings && result.warnings.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <div className="mb-1 flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" /> Setup warnings
          </div>
          <ul className="list-disc space-y-1 pl-5 text-[12px]">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {result?.summary && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{result.summary}</p>
            <p className="mt-1 text-white/50">
              Mode: {result.mode} · Approvals: {result.approvalIds?.length || 0} · HubSpot: {result.hubspotSynced || 0}
            </p>
          </div>
        </div>
      )}

      {companies.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-bs-border">
          <table className="min-w-full text-left text-[12px]">
            <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-bs-muted">
              <tr>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Website</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Sources</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((lead) => (
                <tr key={lead.companyName} className="border-t border-bs-border/60">
                  <td className="px-3 py-2 font-medium">{lead.companyName}</td>
                  <td className="px-3 py-2">{lead.contactName || "—"}</td>
                  <td className="px-3 py-2">{lead.publicEmail || "—"}</td>
                  <td className="px-3 py-2">{lead.publicPhone || "—"}</td>
                  <td className="px-3 py-2">
                    {lead.website ? (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-bs-accent hover:underline">
                        Link
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">{lead.country || "—"}</td>
                  <td className="px-3 py-2">{Math.round(lead.confidenceScore * 100)}%</td>
                  <td className="px-3 py-2">pending approval</td>
                  <td className="px-3 py-2">
                    {lead.sourceUrls?.[0] ? (
                      <a
                        href={lead.sourceUrls[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-bs-accent hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Source
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
