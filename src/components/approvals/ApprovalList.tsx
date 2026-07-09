"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { ApprovalCard, type ApprovalItem } from "@/components/approvals/ApprovalCard";
import { useAppStore } from "@/store/useAppStore";

function mapStoreApproval(a: {
  id: string;
  agentSlug: string;
  type: string;
  title: string;
  description?: string;
  preview?: string;
  riskLevel: string;
  status: string;
}): ApprovalItem {
  return {
    id: a.id,
    agentSlug: a.agentSlug,
    type: a.type,
    title: a.title,
    description: a.description,
    preview: a.preview,
    riskLevel: a.riskLevel,
    status: a.status,
  };
}

export function ApprovalList({ initialItems }: { initialItems: ApprovalItem[] }) {
  const n8nApprovals = useAppStore((s) => s.n8nApprovals);
  const [items, setItems] = useState(initialItems);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch("/api/approvals");
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch {
      // keep current items
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 5000);
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  useEffect(() => {
    if (n8nApprovals.length === 0) return;
    setItems((prev) => {
      const merged = [...n8nApprovals.map(mapStoreApproval), ...prev];
      const seen = new Set<string>();
      return merged.filter((item) => {
        const key = item.id || `${item.title}-${item.agentSlug}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
  }, [n8nApprovals]);

  const handleApprove = useCallback(async (id: string) => {
    setProcessingId(id);
    setToast(null);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED", approvedBy: "Admin" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error || "Approval failed");
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, status: "APPROVED", n8nMessage: data.n8n?.message }
            : i
        )
      );
      setToast(data.n8n?.ok ? "n8n workflow triggered" : data.n8n?.message || "Approved — n8n will execute");
    } catch {
      setToast("Connection error");
    } finally {
      setProcessingId(null);
    }
  }, []);

  const handleReject = useCallback(async (id: string) => {
    setProcessingId(id);
    try {
      await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", approvedBy: "Admin" }),
      });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "REJECTED" } : i)));
    } finally {
      setProcessingId(null);
    }
  }, []);

  const pending = items.filter((i) => i.status === "PENDING");

  return (
    <>
      <Header
        title="Approval Queue"
        subtitle="All actions require approval before n8n executes emails, CRM or outreach"
      />
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="glass rounded-xl px-4 py-2 text-sm">
          <span className="text-bs-muted">Pending: </span>
          <span className="font-medium text-amber-400">{pending.length}</span>
        </div>
        {toast && (
          <div className="rounded-xl border border-bs-accent/30 bg-bs-accent/10 px-4 py-2 text-sm text-bs-accent-light">
            {toast}
          </div>
        )}
      </div>
      {items.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-bs-muted">
          No approval cards yet. Send a command via Quick Command to generate n8n approval requests.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <ApprovalCard
              key={item.id}
              item={item}
              processingId={processingId}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </>
  );
}
